import "server-only";
import { inflateSync, inflateRawSync } from "node:zlib";

/**
 * Turning an uploaded CV into plain text, with no dependencies.
 *
 * A student uploading the CV they already have is the whole point of the upload
 * path, and the file they have is a PDF or a Word document. So both have to
 * work. Adding a PDF parsing library for this was rejected: the two formats need
 * about 150 lines between them, and a marketing site that pulls in a megabyte of
 * parser to read a two-page CV has made a bad trade.
 *
 * The honest limit of doing it this way is scanned PDFs. A PDF that is a
 * photograph of a printed CV contains no text to extract, and no amount of
 * parsing will find any. `looksLikeText` catches that case so the student is
 * told to paste instead of being handed an empty form and left wondering what
 * went wrong.
 *
 * Nothing here touches the disk. The file arrives as a buffer, is read in
 * memory, and is dropped when the request ends.
 */

export type Extraction = {
  text: string;
  /** How it was read, shown to the student so the result is never a mystery. */
  via: "pdf" | "docx" | "text";
  /** False when a file parsed but yielded nothing usable, a scan, usually. */
  usable: boolean;
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function extractText(buf: Buffer, filename: string): Extraction {
  const lower = filename.toLowerCase();

  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    const text = clean(reflow(pdfText(buf)));
    return { text, via: "pdf", usable: looksLikeText(text) };
  }

  // A DOCX is a ZIP. So is an ODT, which the same reader handles by looking for
  // its own body file.
  if (buf.subarray(0, 2).toString("latin1") === "PK") {
    const text = clean(zipDocText(buf));
    return { text, via: "docx", usable: looksLikeText(text) };
  }

  if (lower.endsWith(".doc")) {
    // Legacy binary .doc. Runs of readable text can be salvaged, which is
    // better than refusing outright, but it is rough and says so.
    const text = clean(reflow(salvageBinary(buf)));
    return { text, via: "docx", usable: looksLikeText(text) };
  }

  const text = clean(buf.toString("utf8"));
  return { text, via: "text", usable: looksLikeText(text) };
}

/* --------------------------------------------------------------------------
   ZIP, enough of it to reach one file inside a DOCX.

   The central directory is used rather than the local headers, because a local
   header written by a streaming writer may carry zero for the sizes and put the
   real values in a trailing data descriptor. The central directory is always
   correct, which makes it the only reliable way in.
-------------------------------------------------------------------------- */
function zipDocText(buf: Buffer): string {
  const wanted = ["word/document.xml", "content.xml"]; // docx, then odt
  const eocd = findEocd(buf);
  if (eocd < 0) return "";

  const entries = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  const found = new Map<string, Buffer>();
  const extras: string[] = [];

  for (let i = 0; i < entries && ptr + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compressed = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localAt = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");

    // Headers and footers hold the name and contact details often enough to be
    // worth reading, so they are collected after the body.
    const isBody = wanted.includes(name);
    const isAux = /^word\/(header|footer)\d*\.xml$/.test(name);

    if (isBody || isAux) {
      const data = readEntry(buf, localAt, method, compressed);
      if (data) {
        if (isBody) found.set(name, data);
        else extras.push(xmlToText(data.toString("utf8")));
      }
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  const body = wanted.map((w) => found.get(w)).find(Boolean);
  const bodyText = body ? xmlToText(body.toString("utf8")) : "";
  return [bodyText, ...extras].filter(Boolean).join("\n");
}

function readEntry(buf: Buffer, localAt: number, method: number, compressed: number): Buffer | null {
  if (localAt + 30 > buf.length || buf.readUInt32LE(localAt) !== 0x04034b50) return null;
  const nameLen = buf.readUInt16LE(localAt + 26);
  const extraLen = buf.readUInt16LE(localAt + 28);
  const start = localAt + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, compressed ? start + compressed : buf.length);
  try {
    return method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
  } catch {
    return null;
  }
}

function findEocd(buf: Buffer): number {
  // The EOCD sits at the very end unless there is a trailing comment, which is
  // capped at 65535 bytes. So this is the whole search space.
  const from = Math.max(0, buf.length - 66_000);
  for (let i = buf.length - 22; i >= from; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

/**
 * WordprocessingML to text.
 *
 * Only three tags matter for reading a CV: the paragraph, the line break, and
 * the tab Word uses to push a date out to the right margin. Everything else is
 * formatting, and dropping it is the point.
 */
function xmlToText(xml: string): string {
  return decodeEntities(
    xml
      .replace(/<w:tab\b[^>]*\/?>/g, "\t")
      .replace(/<w:br\b[^>]*\/?>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<text:tab\b[^>]*\/?>/g, "\t") // odt
      .replace(/<\/text:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

/* --------------------------------------------------------------------------
   PDF.

   This is not a full PDF implementation. It does not read the cross-reference
   table and it does not follow object streams, it scans for stream/endstream,
   inflates what it finds, and reads the text-showing operators out of anything
   that has them.

   It does, however, have to resolve font encodings, and that is not optional.
   Chrome, Google Docs, Canva and LaTeX all embed subset fonts with Identity
   encoding, which means the content stream says `<0036> Tj` where 0x36 is a
   glyph number in a font nobody else has. Read naively, a CV exported from
   Google Docs comes out as line noise. The mapping back to real characters is
   in the file, every such PDF carries a /ToUnicode CMap so that copy-and-paste
   works, so the reader parses those and uses them.

   For anything stranger, looksLikeText refuses and the student pastes instead.
-------------------------------------------------------------------------- */

/** A font's code-to-text mapping, from its /ToUnicode CMap. */
type CMap = Map<number, string>;

function pdfText(buf: Buffer): string {
  const fonts = fontMaps(buf);
  const out: string[] = [];
  const marker = Buffer.from("stream", "latin1");
  let at = 0;

  while (at < buf.length) {
    const start = buf.indexOf(marker, at);
    if (start < 0) break;

    let dataAt = start + 6;
    if (buf[dataAt] === 0x0d) dataAt++;
    if (buf[dataAt] === 0x0a) dataAt++;

    const end = buf.indexOf(Buffer.from("endstream", "latin1"), dataAt);
    if (end < 0) break;

    const raw = buf.subarray(dataAt, end);
    at = end + 9;

    if (raw.length < 12 || raw.length > 12_000_000) continue;

    let content: string | null = null;
    for (const attempt of [inflateSync, inflateRawSync]) {
      try {
        content = attempt(raw).toString("latin1");
        break;
      } catch {
        /* not this one */
      }
    }
    // Uncompressed content streams exist too, and are readable as they are.
    if (content == null) {
      const plain = raw.toString("latin1");
      if (/\b(Tj|TJ)\b/.test(plain)) content = plain;
    }
    if (!content || !/\b(Tj|TJ)\b/.test(content)) continue;

    out.push(readContentStream(content, fonts));
  }

  return out.join("\n");
}

/**
 * Reads one content stream.
 *
 * A real token scanner rather than a pattern match, because the operands decide
 * the answer in two places a regex cannot see. Chrome positions every single
 * glyph with its own `Td`, so treating `Td` as a line break, which it is in a
 * document laid out line by line, would put one character on each line. What
 * separates the two cases is whether the vertical operand moved.
 */
function readContentStream(content: string, fonts: Map<string, CMap>): string {
  const TOKEN = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>|\[|\]|[-+]?(?:\d*\.\d+|\d+\.?)|\/[^\s/<>[\]()]+|[A-Za-z*'"]+/g;

  let out = "";
  let stack: string[] = [];
  /** Collected TJ array items, while inside brackets. */
  let array: string[] | null = null;
  let font: CMap | undefined;
  /** The merged map is the fallback for a font we could not tie to a name. */
  const merged = fonts.get("*");

  const newline = () => {
    if (out && !out.endsWith("\n")) out += "\n";
  };
  const show = (token: string) => {
    out += token.startsWith("(") ? pdfString(token.slice(1, -1)) : hexString(token.slice(1, -1), font ?? merged);
  };
  const num = (i: number) => Number(stack[stack.length - i]) || 0;

  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(content))) {
    const tok = m[0];

    if (tok === "[") {
      array = [];
      continue;
    }
    if (tok === "]") {
      stack.push("]");
      continue;
    }
    // Strings, numbers and names are operands until an operator claims them.
    if (tok.startsWith("(") || tok.startsWith("<") || tok.startsWith("/") || /^[-+.\d]/.test(tok)) {
      if (array) array.push(tok);
      else stack.push(tok);
      continue;
    }

    switch (tok) {
      case "Tf": {
        // /F4 14.66 Tf. The resource name is the operand before the size.
        const name = stack.find((s) => s.startsWith("/"));
        font = name ? fonts.get(name.slice(1)) : undefined;
        break;
      }
      case "Tj":
      case "'":
      case '"': {
        const str = [...stack].reverse().find((s) => s.startsWith("(") || s.startsWith("<"));
        if (str) show(str);
        if (tok !== "Tj") newline();
        break;
      }
      case "TJ": {
        /*
         * A large negative kern is a word space. That is how justified text
         * encodes its gaps when the font has no space glyph of its own. The
         * question is what counts as large, and a fixed threshold gets it
         * wrong: at -180 an experience letter came out with "enquir ies" and
         * "Tr aining", because that PDF used kerns of that size for ordinary
         * letter pairs.
         *
         * So the threshold is taken from the run itself. Most kerns in an array
         * are letter spacing; a word gap is several times bigger. Comparing
         * against this array's own median finds the outliers whatever units the
         * generator happened to use, and a word broken in half is worse than a
         * missing space, it defeats every later pattern match.
         */
        const items = array ?? [];
        const kerns = items
          .filter((i) => !i.startsWith("(") && !i.startsWith("<"))
          .map((i) => Math.abs(Number(i)))
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => a - b);
        const median = kerns.length ? kerns[Math.floor(kerns.length / 2)] : 0;
        const gap = kerns.length >= 3 ? Math.max(180, median * 2.2) : 180;

        for (const item of items) {
          if (item.startsWith("(") || item.startsWith("<")) show(item);
          else if (-Number(item) >= gap) out += " ";
        }
        array = null;
        break;
      }
      case "Td":
      case "TD": {
        // tx ty Td. A vertical move is a new line; a horizontal one is the
        // same line, and per-glyph positioning is all horizontal.
        if (Math.abs(num(1)) > 0.6) newline();
        break;
      }
      case "T*":
      case "ET":
      case "BT":
        newline();
        break;
      case "Tm": {
        // a b c d e f Tm. The f is the vertical origin of a new text block.
        newline();
        break;
      }
      default:
        break;
    }

    stack = [];
    if (tok !== "TJ") array = null;
  }

  return out;
}

/**
 * Builds the document's font maps: resource name to code-to-text mapping.
 *
 * Objects are found by scanning for "N 0 obj" rather than through the
 * cross-reference table, which is both simpler and more tolerant of the
 * slightly malformed PDFs that real exporters produce. A merged map is stored
 * under "*" as the fallback for content that references a font by a name the
 * resource dictionaries did not mention.
 */
function fontMaps(buf: Buffer): Map<string, CMap> {
  const latin = buf.toString("latin1");
  const out = new Map<string, CMap>();
  const merged: CMap = new Map();

  // --- Index every object's byte range.
  const bodies = new Map<number, { from: number; to: number }>();
  for (const m of latin.matchAll(/(\d+)\s+0\s+obj\b/g)) {
    const from = m.index! + m[0].length;
    const to = latin.indexOf("endobj", from);
    bodies.set(Number(m[1]), { from, to: to < 0 ? Math.min(latin.length, from + 400_000) : to });
  }
  const body = (n: number) => {
    const at = bodies.get(n);
    return at ? latin.slice(at.from, at.to) : "";
  };

  // --- Every font's ToUnicode CMap, by font object number.
  const byObject = new Map<number, CMap>();
  for (const [n, at] of bodies) {
    const text = latin.slice(at.from, Math.min(at.to, at.from + 4000));
    if (!/\/(?:BaseFont|Type\s*\/\s*Font)/.test(text)) continue;
    const ref = text.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (!ref) continue;
    const cmap = parseCMap(buf, latin, bodies.get(Number(ref[1])));
    if (cmap.size) {
      byObject.set(n, cmap);
      for (const [code, ch] of cmap) if (!merged.has(code)) merged.set(code, ch);
    }
  }

  // --- Resource dictionaries, which give those fonts the names the content
  // stream uses. /Font may be inline or an indirect reference.
  for (const m of latin.matchAll(/\/Font\s*(?:(\d+)\s+0\s+R|<<)/g)) {
    const dict = m[1]
      ? body(Number(m[1]))
      : latin.slice(m.index! + m[0].length, latin.indexOf(">>", m.index! + m[0].length) + 2);
    for (const pair of dict.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+0\s+R/g)) {
      const cmap = byObject.get(Number(pair[2]));
      if (cmap) out.set(pair[1], cmap);
    }
  }

  if (merged.size) out.set("*", merged);
  return out;
}

/**
 * Parses a /ToUnicode CMap stream.
 *
 * Only the two operators that matter: bfchar, which maps codes one at a time,
 * and bfrange, which maps a run either onto a consecutive run of characters or
 * onto an explicit list.
 */
function parseCMap(buf: Buffer, latin: string, at: { from: number; to: number } | undefined): CMap {
  const map: CMap = new Map();
  if (!at) return map;

  const region = latin.slice(at.from, at.to);
  const streamAt = region.indexOf("stream");
  if (streamAt < 0) return map;

  let dataAt = at.from + streamAt + 6;
  if (buf[dataAt] === 0x0d) dataAt++;
  if (buf[dataAt] === 0x0a) dataAt++;
  const endAt = latin.indexOf("endstream", dataAt);
  if (endAt < 0) return map;

  const raw = buf.subarray(dataAt, endAt);
  let text: string | null = null;
  for (const attempt of [inflateSync, inflateRawSync]) {
    try {
      text = attempt(raw).toString("latin1");
      break;
    } catch {
      /* may not be compressed at all */
    }
  }
  if (text == null) text = raw.toString("latin1");
  if (!/beginbf(char|range)/.test(text)) return map;

  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    const pairs = [...block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)];
    for (const [, from, to] of pairs) map.set(parseInt(from, 16), utf16(to));
  }

  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const body = block[1];
    // <lo> <hi> [<a> <b> <c>]
    for (const m of body.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(m[1], 16);
      const items = [...m[3].matchAll(/<([0-9A-Fa-f]*)>/g)];
      items.forEach((item, i) => map.set(lo + i, utf16(item[1])));
    }
    // <lo> <hi> <dst>
    for (const m of body.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      const dst = parseInt(m[3], 16);
      // A runaway range would fill memory for nothing; a CV needs none.
      if (hi < lo || hi - lo > 65_535) continue;
      for (let c = lo; c <= hi; c++) map.set(c, safeChar(dst + (c - lo)));
    }
  }

  return map;
}

/** A CMap destination, which is UTF-16BE and may be a surrogate pair. */
function utf16(hex: string): string {
  let out = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  if (!out && hex.length) out = safeChar(parseInt(hex, 16));
  return out;
}

const safeChar = (code: number) => (code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "");

/** PDF literal string escapes, including the three-digit octal form. */
function pdfString(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== "\\") {
      out += c;
      continue;
    }
    const next = s[++i];
    if (next === undefined) break;
    if (next >= "0" && next <= "7") {
      let oct = next;
      while (oct.length < 3 && s[i + 1] >= "0" && s[i + 1] <= "7") oct += s[++i];
      out += String.fromCharCode(parseInt(oct, 8));
    } else if (next === "n" || next === "r") out += "\n";
    else if (next === "t") out += "\t";
    else if (next === "b" || next === "f") out += " ";
    else if (next === "\n") continue; // a line continuation inside the string
    else out += next;
  }
  return out;
}

/**
 * Hex strings.
 *
 * With the font's CMap, two-byte codes resolve to real characters. This is the
 * Identity-encoded subset font case, which is most PDFs in the wild. Without
 * one, two-byte codes are read as UTF-16 and single bytes as Latin-1, and
 * looksLikeText is left to reject the result if it turns out to be nonsense.
 */
function hexString(hex: string, cmap?: CMap): string {
  const digits = hex.replace(/\s+/g, "");
  if (!digits.length) return "";

  const twoByte = digits.length % 4 === 0;

  if (cmap?.size && twoByte) {
    let out = "";
    let hits = 0;
    for (let i = 0; i + 4 <= digits.length; i += 4) {
      const code = parseInt(digits.slice(i, i + 4), 16);
      const mapped = cmap.get(code);
      if (mapped != null) {
        out += mapped;
        hits++;
      }
    }
    // A map that resolved most of the codes is the right one. If it resolved
    // almost none, this font was not the one we thought and the raw reading
    // below is no worse.
    if (hits / (digits.length / 4) > 0.5) return out;
  }

  if (cmap?.size && !twoByte) {
    let out = "";
    let hits = 0;
    for (let i = 0; i + 2 <= digits.length; i += 2) {
      const mapped = cmap.get(parseInt(digits.slice(i, i + 2), 16));
      if (mapped != null) {
        out += mapped;
        hits++;
      }
    }
    if (hits / (digits.length / 2) > 0.5) return out;
  }

  if (twoByte) {
    let out = "";
    let printable = 0;
    for (let i = 0; i < digits.length; i += 4) {
      const code = parseInt(digits.slice(i, i + 4), 16);
      if (code >= 32 && code < 0xfffd) printable++;
      out += String.fromCharCode(code);
    }
    // A subset font's glyph numbers are small integers, which land in the
    // control range. If most did, this was not text.
    return printable / (digits.length / 4) > 0.6 ? out : "";
  }

  let out = "";
  for (let i = 0; i < digits.length; i += 2) {
    out += String.fromCharCode(parseInt(digits.slice(i, i + 2).padEnd(2, "0"), 16));
  }
  return out;
}
/* --------------------------------------------------------------------------
   Shared
-------------------------------------------------------------------------- */

/** Readable ASCII runs out of a binary file. Last resort, for legacy .doc. */
function salvageBinary(buf: Buffer): string {
  const out: string[] = [];
  let run = "";
  for (const byte of buf) {
    if ((byte >= 32 && byte < 127) || byte === 9) run += String.fromCharCode(byte);
    else {
      if (run.length >= 4) out.push(run);
      run = "";
    }
  }
  if (run.length >= 4) out.push(run);
  return out.join("\n");
}

/**
 * Puts hard-wrapped lines back together.
 *
 * A PDF has no idea what a paragraph is. It has lines placed on a page, and if
 * whatever produced it wrapped at a fixed width the break can land mid-word.
 * A letter read straight out of one gave "customer enquir / ies" and "wa / s
 * employed", which defeats every pattern downstream: no regex for a job title
 * or a qualification survives the word being cut in half.
 *
 * Joining every line would destroy the structure the section parsers rely on,
 * so a join needs all three of these to hold:
 *
 *   1. The line is long, close to the longest in the document, so it ended
 *      because it ran out of room rather than because it ended.
 *   2. It does not end in sentence punctuation.
 *   3. The next line starts lower-case, so it is a continuation and not a new
 *      heading, name or field.
 *
 * A hyphen at a line end is joined on its own, which is unambiguous.
 *
 * Applied to PDFs and to salvaged legacy .doc only. A DOCX gives real paragraph
 * marks, and those are never a wrap.
 */
function reflow(s: string): string {
  const lines = s.split("\n");
  const lengths = lines.map((l) => l.trim().length).filter((n) => n > 0).sort((a, b) => a - b);
  if (lengths.length < 4) return s;
  // The 90th percentile rather than the maximum, so one very long line does not
  // set a bar nothing else can reach.
  const wide = lengths[Math.floor(lengths.length * 0.9)];
  if (wide < 40) return s;

  const out: string[] = [];
  /*
   * The raw length of whichever line is currently at the end of `out`, which
   * is what decides whether a space goes back in. Once lines have been joined
   * the accumulated length says nothing about how the original broke.
   *
   * A wrapper that breaks mid-word fills the line to the limit exactly, so no
   * space was ever there. One that breaks between words leaves the line short,
   * because it moved a whole word down, and there a space was consumed and has
   * to come back. Getting this backwards gives "Maintainingthe daily register".
   */
  let tailRaw = 0;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const prev = out[out.length - 1];

    if (prev !== undefined && /[A-Za-z]-$/.test(prev)) {
      out[out.length - 1] = prev.replace(/-$/, "") + line.trimStart();
      tailRaw = line.length;
      continue;
    }

    const looksWrapped =
      prev !== undefined &&
      tailRaw >= wide * 0.9 &&
      !/[.!?:;)\]"]$/.test(prev) &&
      /^[a-z]/.test(line);

    if (looksWrapped) {
      const midWord = tailRaw >= wide - 2 && /[A-Za-z]$/.test(prev) && /^[a-z]/.test(line);
      out[out.length - 1] = `${prev}${midWord ? "" : " "}${line.trimStart()}`;
      tailRaw = line.length;
    } else {
      out.push(line);
      tailRaw = line.length;
    }
  }
  return out.join("\n");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function clean(s: string): string {
  return (
    s
      .replace(/\r\n?/g, "\n")
      .replace(/ /g, " ")
      // Ligatures, which PDFs emit constantly and which break word matching.
      .replace(/ﬁ/g, "fi")
      .replace(/ﬂ/g, "fl")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[: : ]/g, "-")
      // Bullet glyphs, which arrive as a dozen different characters.
      .replace(/[•●▪·⁃]/g, "- ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3}/g, "\n\n")
      .trim()
      .slice(0, 40_000)
  );
}

/**
 * Whether what came out is prose rather than debris.
 *
 * Three signals, all cheap: enough characters to be a CV at all, a high enough
 * share of letters and spaces, and at least a few common English words. A
 * scanned PDF fails the first, a CID-encoded one fails the second, and a
 * successfully inflated stream of font data fails the third.
 */
export function looksLikeText(s: string): boolean {
  if (s.trim().length < 80) return false;

  const sample = s.slice(0, 4000);
  const letters = (sample.match(/[A-Za-z]/g) ?? []).length;
  const spaces = (sample.match(/\s/g) ?? []).length;
  if ((letters + spaces) / sample.length < 0.62) return false;

  const words = sample.toLowerCase().match(/[a-z]{2}/g) ?? [];
  if (words.length < 20) return false;

  const common = [
    "the", "and", "of", "in", "to", "at", "for", "with", "university", "college",
    "school", "experience", "skills", "nepal", "education", "name", "email",
    "phone", "year", "work", "project",
  ];
  const hits = new Set(words.filter((w) => common.includes(w)));
  return hits.size >= 2;
}

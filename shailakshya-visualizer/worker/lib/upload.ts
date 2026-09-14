/**
 * Upload handling — SPEC §10.
 *
 * "Strip EXIF from uploads. Never store location data." That is a privacy
 * promise, so stripping happens here, before the bytes reach R2 or the model —
 * not as a later cleanup pass. A photo of somebody's house carries their home
 * address in its GPS tags; this is the one piece of the system where a bug is
 * a genuine harm rather than a bad-looking render.
 */
import type { Env } from './env.ts';
import { RefusalError } from './types.ts';
import { sha256Hex } from './cache.ts';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** SPEC §10: uploaded photos are deleted after 30 days. */
export const UPLOAD_RETENTION_DAYS = 30;

export interface PreparedUpload {
  bytes: Uint8Array;
  contentType: string;
  /** Content hash of the stripped bytes — also the cache key component. */
  hash: string;
  key: string;
}

export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size === 0) {
    throw new RefusalError(
      'bad_upload',
      'That file appears to be empty. Please choose a photo.',
      'त्यो फाइल खाली छ। कृपया फोटो छान्नुहोस्।',
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new RefusalError(
      'bad_upload',
      'That photo is larger than 10 MB. Please choose a smaller one.',
      'फोटो १० MB भन्दा ठूलो छ। सानो फोटो छान्नुहोस्।',
    );
  }

  const raw = new Uint8Array(await file.arrayBuffer());

  // Trust the bytes, not the header. The content type a browser reports is
  // client-supplied, so a renamed file would otherwise sail straight through.
  // When the magic number is unrecognised the upload is refused outright —
  // falling back to the declared type here would undo the whole check.
  const actual = sniff(raw);
  if (actual === null || !ACCEPTED.has(actual)) {
    throw new RefusalError(
      'bad_upload',
      'Please upload a JPEG, PNG or WebP photo.',
      'कृपया JPEG, PNG वा WebP फोटो अपलोड गर्नुहोस्।',
    );
  }

  const bytes = stripMetadata(raw, actual);
  const hash = await sha256Hex(bytes.buffer as ArrayBuffer);

  return { bytes, contentType: actual, hash, key: `uploads/${hash}` };
}

/** Magic-number sniffing for the three formats we accept. */
function sniff(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  const ascii = (i: number) => String.fromCharCode(bytes[i] ?? 0);
  const tag = ascii(0) + ascii(1) + ascii(2) + ascii(3);
  const webp = ascii(8) + ascii(9) + ascii(10) + ascii(11);
  if (tag === 'RIFF' && webp === 'WEBP') return 'image/webp';

  return null;
}

function stripMetadata(bytes: Uint8Array, contentType: string): Uint8Array {
  switch (contentType) {
    case 'image/jpeg':
      return stripJpeg(bytes);
    case 'image/png':
      return stripPng(bytes);
    case 'image/webp':
      return stripWebp(bytes);
    default:
      return bytes;
  }
}

/**
 * Walks JPEG marker segments and drops every APPn (EXIF, GPS, XMP, Photoshop
 * IRB) and COM comment. Everything else is copied through untouched, so the
 * image itself is bit-identical.
 */
function stripJpeg(bytes: Uint8Array): Uint8Array {
  const out: number[] = [0xff, 0xd8];
  let i = 2;

  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      // Not at a marker — the file is malformed or we have hit entropy-coded
      // data early. Copy the remainder verbatim rather than corrupt it.
      out.push(...bytes.subarray(i));
      break;
    }

    const marker = bytes[i + 1] ?? 0;

    // Start of scan: image data runs to the end. Nothing to strip past here.
    if (marker === 0xda) {
      out.push(...bytes.subarray(i));
      break;
    }

    // Standalone markers carry no payload.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }

    const length = ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
    if (length < 2) break;

    // APP0 is the JFIF header — density and thumbnail dimensions, no personal
    // data — and some decoders are unhappy without it, so it stays. Everything
    // from APP1 up is dropped: APP1 carries EXIF (including the GPS tags that
    // are the actual privacy risk here) and XMP, APP13 carries IPTC. COM is a
    // free-text comment field and can hold anything at all.
    const isAppSegment = marker >= 0xe1 && marker <= 0xef;
    const isComment = marker === 0xfe;

    if (!isAppSegment && !isComment) {
      out.push(...bytes.subarray(i, i + 2 + length));
    }

    i += 2 + length;
  }

  return new Uint8Array(out);
}

/** Keeps only the PNG chunks needed to render; drops eXIf, tEXt, iTXt, tIME. */
function stripPng(bytes: Uint8Array): Uint8Array {
  const KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'sRGB']);
  const out: number[] = [...bytes.subarray(0, 8)];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 8;

  while (i + 8 <= bytes.length) {
    const length = view.getUint32(i);
    const name = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
    const total = 12 + length;
    if (i + total > bytes.length) break;

    if (KEEP.has(name)) out.push(...bytes.subarray(i, i + total));

    i += total;
    if (name === 'IEND') break;
  }

  return new Uint8Array(out);
}

/** Drops EXIF and XMP chunks from a RIFF/WEBP container. */
function stripWebp(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = [...bytes.subarray(0, 12)];
  const body: number[] = [];
  let i = 12;

  while (i + 8 <= bytes.length) {
    const fourcc = String.fromCharCode(...bytes.subarray(i, i + 4));
    const size = view.getUint32(i + 4, true);
    // RIFF chunks are padded to an even length.
    const total = 8 + size + (size % 2);
    if (i + total > bytes.length) break;

    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      body.push(...bytes.subarray(i, i + total));
    }

    i += total;
  }

  const out = new Uint8Array(12 + body.length);
  out.set(header, 0);
  out.set(body, 12);
  // Rewrite the RIFF size field to match what we actually kept.
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  return out;
}

export async function storeUpload(
  env: Env,
  upload: PreparedUpload,
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + UPLOAD_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await env.IMAGES.put(upload.key, upload.bytes as unknown as ArrayBuffer, {
    httpMetadata: { contentType: upload.contentType },
    // The scheduled sweep reads this; an R2 lifecycle rule enforces it too, so
    // deletion does not depend on the cron having run.
    customMetadata: { expiresAt, kind: 'upload' },
  });
}

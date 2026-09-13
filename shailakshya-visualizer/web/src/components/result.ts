/**
 * Result view — SPEC §9: full bleed, the image is the product.
 *
 * The day/night pair is the cheap trick that reads as dimensional (SPEC §3), so
 * it is the primary control rather than a detail tucked away.
 *
 * Downloads are composited through a canvas so the "visualization only" notice
 * is burned into the pixels, not merely drawn over them in the page (SPEC §10:
 * "on the image itself, not just the page"). An image shared onward to Viber or
 * Facebook carries the notice with it.
 */
import { el } from '../lib/dom.ts';
import type { GenerationResult, StylePack } from '../lib/api.ts';

const NOTICE_EN = 'Visualization only — not a construction specification.';
const NOTICE_NE = 'यो केवल कल्पना हो — निर्माण नक्सा होइन।';
const MARK = 'Shailakshya Griha Nirman';

export interface ResultOptions {
  result: GenerationResult;
  pack: StylePack;
  onRestart: () => void;
}

export function resultView({ result, pack, onRestart }: ResultOptions): HTMLElement {
  const ordered = ['day', 'night']
    .map((variant) => result.images.find((image) => image.variant === variant))
    .filter((image): image is GenerationResult['images'][number] => Boolean(image));

  let current = 0;

  const img = el('img', {
    class: 'sgv__result-img sgv__result-img--loading',
    alt: `Your house in the ${pack.nameEn} style`,
    // Required so the canvas composite below is not tainted.
    crossorigin: 'anonymous',
    decoding: 'async',
  });

  const show = (index: number) => {
    const image = ordered[index];
    if (!image) return;
    current = index;
    img.classList.add('sgv__result-img--loading');
    img.src = image.url;
  };

  img.addEventListener('load', () => img.classList.remove('sgv__result-img--loading'));

  const toggle = el('div', { class: 'sgv__toggle', role: 'group', 'aria-label': 'Lighting' });
  const toggles = ordered.map((image, index) => {
    const button = el('button', {
      type: 'button',
      'aria-pressed': String(index === 0),
      text: image.variant === 'day' ? 'Daylight' : 'Evening',
    });
    button.addEventListener('click', () => {
      toggles.forEach((other, i) => other.setAttribute('aria-pressed', String(i === index)));
      show(index);
    });
    toggle.append(button);
    return button;
  });

  const download = el('button', {
    class: 'sgv__btn sgv__btn--onDark',
    type: 'button',
    text: 'Save image',
  });
  download.addEventListener('click', () => {
    void saveWithNotice(img, `shailakshya-${pack.id}-${ordered[current]?.variant ?? 'day'}`);
  });

  const again = el('button', {
    class: 'sgv__btn sgv__btn--primary',
    type: 'button',
    text: 'Try another style',
  });
  again.addEventListener('click', onRestart);

  show(0);

  // Swipe between the two views — the gesture people expect on a phone.
  const stage = el('div', { class: 'sgv__result-stage' }, [img]);
  let startX = 0;
  stage.addEventListener('touchstart', (event) => {
    startX = event.touches[0]?.clientX ?? 0;
  }, { passive: true });
  stage.addEventListener('touchend', (event) => {
    const delta = (event.changedTouches[0]?.clientX ?? 0) - startX;
    if (Math.abs(delta) < 50) return;
    const next = (current + (delta < 0 ? 1 : -1) + ordered.length) % ordered.length;
    toggles[next]?.click();
  });

  return el('section', { class: 'sgv__result' }, [
    stage,
    el('div', { class: 'sgv__result-bar' }, [
      toggle,
      el('div', { class: 'sgv__result-actions' }, [download, again]),
    ]),
    el('p', { class: 'sgv__notice' }, [
      el('strong', { text: NOTICE_EN }),
      ' ',
      el('span', { class: 'ne', lang: 'ne', text: NOTICE_NE }),
      result.cached
        ? ' This design was already saved, so it appeared instantly.'
        : '',
    ]),
  ]);
}

/**
 * Draws the image plus a notice band onto a canvas and saves the result, so the
 * file that leaves the site carries the disclaimer and the company name.
 *
 * Falls back to the plain image if the canvas is tainted or unsupported —
 * losing the burned-in notice is bad, but the page still shows it, and a
 * visitor who cannot save anything at all is worse.
 */
async function saveWithNotice(source: HTMLImageElement, filename: string): Promise<void> {
  try {
    const width = source.naturalWidth || 1024;
    const height = source.naturalHeight || 768;
    const band = Math.max(Math.round(height * 0.075), 44);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height + band;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');

    ctx.drawImage(source, 0, 0, width, height);

    ctx.fillStyle = '#22262B';
    ctx.fillRect(0, height, width, band);

    const pad = Math.round(band * 0.32);
    ctx.fillStyle = '#F2EFE9';
    ctx.font = `600 ${Math.round(band * 0.32)}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(NOTICE_EN, pad, height + band * 0.38);

    ctx.fillStyle = '#C9C2B6';
    ctx.font = `${Math.round(band * 0.26)}px system-ui, sans-serif`;
    ctx.fillText(NOTICE_NE, pad, height + band * 0.74);

    ctx.fillStyle = '#E0A11B';
    ctx.textAlign = 'right';
    ctx.font = `600 ${Math.round(band * 0.28)}px system-ui, sans-serif`;
    ctx.fillText(MARK, width - pad, height + band * 0.5);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.92),
    );
    if (!blob) throw new Error('encode failed');

    triggerDownload(URL.createObjectURL(blob), `${filename}.webp`, true);
  } catch (err) {
    console.warn('composited save failed, saving the plain image', err);
    triggerDownload(source.src, `${filename}.png`, false);
  }
}

function triggerDownload(href: string, filename: string, revoke: boolean): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

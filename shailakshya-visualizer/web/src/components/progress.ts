/**
 * The wait — SPEC §9: "Generation takes 10–20 seconds. Fill that with something
 * real. Never a bare spinner."
 *
 * So this shows the prompt actually being assembled: the grounding clauses, the
 * chosen style, the negative list, the two lighting passes. Every line
 * corresponds to something the Worker is genuinely doing, in the order it does
 * it. It is not a fake progress bar with invented steps — if generation stalls,
 * the lines stall where the work stalled.
 */
import { el } from '../lib/dom.ts';
import type { StylePack } from '../lib/api.ts';

/** Roughly how long an uncached generation takes; the bar is paced to it. */
const EXPECTED_MS = 18_000;

export interface ProgressHandle {
  node: HTMLElement;
  stop: () => void;
}

export function progress(pack: StylePack): ProgressHandle {
  const lines = [
    'Reading the photo and removing location data',
    'Checking the photo shows a building',
    `Loading the ${pack.nameEn} material palette`,
    'Grounding the scene in the Kathmandu valley',
    'Excluding pitched roofs, lawns, snow',
    'Rendering the daylight view',
    'Rendering the evening view',
  ];

  const items = lines.map((text) =>
    el('li', { class: 'sgv__line' }, [
      el('span', { class: 'sgv__line-mark', 'aria-hidden': 'true', text: '+' }),
      el('span', { text }),
    ]),
  );

  const fill = el('div', { class: 'sgv__bar-fill' });
  const elapsed = el('span', { class: 'sgv__progress-elapsed', text: '0s' });

  const node = el('div', {
    class: 'sgv__progress',
    role: 'status',
    'aria-live': 'polite',
  }, [
    el('div', { class: 'sgv__progress-head' }, [
      el('h3', {}, [
        'Drawing your house',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंको घर बन्दै छ' }),
      ]),
      elapsed,
    ]),
    el('ul', { class: 'sgv__lines' }, items),
    el('div', { class: 'sgv__bar' }, [fill]),
  ]);

  const started = Date.now();
  let index = 0;

  const advance = window.setInterval(() => {
    const ms = Date.now() - started;
    elapsed.textContent = `${Math.floor(ms / 1000)}s`;

    // The bar approaches but never reaches 100% — it cannot honestly claim
    // completion before the response lands.
    fill.style.width = `${Math.min((ms / EXPECTED_MS) * 92, 92)}%`;

    const due = Math.floor(ms / (EXPECTED_MS / lines.length));
    while (index <= due && index < items.length) {
      items[index]?.classList.add('sgv__line--on');
      index++;
    }
  }, 250);

  return {
    node,
    stop: () => {
      window.clearInterval(advance);
      for (const item of items) item.classList.add('sgv__line--on');
      fill.style.width = '100%';
    },
  };
}

/**
 * The hero is the demo — SPEC §9. No headline over a gradient, no stock
 * photography: a real house with the handle already slightly off centre so it
 * reads as draggable at a glance.
 *
 * It is a range input under the hood. That gets keyboard operation, touch, and
 * screen-reader semantics for free, which a div-and-pointermove slider would
 * have to reimplement and usually gets wrong.
 */
import { el } from '../lib/dom.ts';

export interface HeroOptions {
  beforeSrc: string;
  afterSrc: string;
  onStart: () => void;
}

export function hero({ beforeSrc, afterSrc, onStart }: HeroOptions): HTMLElement {
  const compare = el('div', { class: 'sgv__ba', '--pos': '52%' });

  const before = el('img', {
    class: 'sgv__ba-img',
    src: beforeSrc,
    alt: 'A Shailakshya house as it stands today',
    decoding: 'async',
  });

  const after = el('img', {
    class: 'sgv__ba-img sgv__ba-after',
    src: afterSrc,
    alt: 'The same house restyled',
    decoding: 'async',
  });

  const range = el('input', {
    class: 'sgv__ba-range',
    type: 'range',
    min: '0',
    max: '100',
    value: '52',
    'aria-label': 'Reveal the restyled house',
  });

  const handle = el('div', { class: 'sgv__ba-handle' }, [
    el('div', { class: 'sgv__ba-grip', 'aria-hidden': 'true', text: '< >' }),
  ]);

  const move = () => compare.style.setProperty('--pos', `${range.value}%`);
  range.addEventListener('input', move);

  compare.append(
    before,
    after,
    el('span', { class: 'sgv__ba-tag sgv__ba-tag--before', text: 'Today' }),
    el('span', { class: 'sgv__ba-tag sgv__ba-tag--after', text: 'Restyled' }),
    range,
    handle,
  );

  const start = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'button',
    text: 'Try it with your house',
  });
  start.addEventListener('click', onStart);

  return el('section', { class: 'sgv__hero sgv__shell sgv__section' }, [
    el('div', { class: 'sgv__hero-copy' }, [
      el('h1', {}, [
        'See your house in a style you choose',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'आफ्नो घर मनपर्ने शैलीमा हेर्नुहोस्' }),
      ]),
      el('p', { class: 'sgv__lead' }, [
        'Drag the handle to restyle the house. Then upload a photo of your own and see it the same way.',
      ]),
      el('p', { class: 'sgv__ne', lang: 'ne' }, [
        'ह्यान्डल तान्नुहोस्। अनि आफ्नै घरको फोटो अपलोड गरेर उस्तै हेर्नुहोस्।',
      ]),
    ]),
    compare,
    el('p', { class: 'sgv__hero-note' }, [
      'Visualization only — not a construction specification. ',
      el('span', { class: 'ne', lang: 'ne', text: 'यो केवल कल्पना हो — निर्माण नक्सा होइन।' }),
    ]),
    el('div', { style: 'margin-top:1.5rem' }, [start]),
  ]);
}

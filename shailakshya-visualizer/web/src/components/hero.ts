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
    alt: 'A house in a plain cement finish',
    decoding: 'async',
  });

  const after = el('img', {
    class: 'sgv__ba-img sgv__ba-after',
    src: afterSrc,
    alt: 'The same house in an exposed brick style',
    decoding: 'async',
  });

  const range = el('input', {
    class: 'sgv__ba-range',
    type: 'range',
    min: '0',
    max: '100',
    value: '52',
    'aria-label': 'Compare the two finishes',
  });

  const handle = el('div', { class: 'sgv__ba-handle' }, [
    el('div', { class: 'sgv__ba-grip', 'aria-hidden': 'true', text: '< >' }),
  ]);

  const move = () => compare.style.setProperty('--pos', `${range.value}%`);
  range.addEventListener('input', move);

  compare.append(
    before,
    after,
    el('span', { class: 'sgv__ba-tag sgv__ba-tag--before', text: 'Plain finish' }),
    el('span', { class: 'sgv__ba-tag sgv__ba-tag--after', text: 'Brick & courtyard' }),
    range,
    handle,
  );

  const start = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'button',
    text: 'Design my house',
  });
  start.addEventListener('click', onStart);

  return el('section', { class: 'sgv__hero sgv__shell sgv__section' }, [
    el('div', { class: 'sgv__hero-copy' }, [
      el('h1', {}, [
        'See your house before you build it',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'बनाउनु अघि आफ्नो घर हेर्नुहोस्' }),
      ]),
      el('p', { class: 'sgv__lead' }, [
        'Tell us the size of your land and what you need. We lay out the floor plan, and show you how the house could look inside and out.',
      ]),
      el('p', { class: 'sgv__ne', lang: 'ne' }, [
        'जग्गाको आकार र आवश्यकता भन्नुहोस्। हामी नक्सा बनाउँछौं र घर कस्तो देखिन्छ देखाउँछौं।',
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

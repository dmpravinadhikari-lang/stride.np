/**
 * The home page.
 *
 * Replaces an opening that was a slider on a drawing followed immediately by a
 * large form — which asked for work before showing anything worth the work.
 *
 * The shape follows what the tools in this category do well (maket.ai,
 * ideal.house, openart): lead with the output, make the free part the hook,
 * explain in three steps, answer the objections in an FAQ, and let a style card
 * be the way in rather than a field buried inside a form.
 *
 * Two deliberate departures from those references:
 *
 *  - No invented social proof. Those pages lead with user counts and press
 *    logos; we have neither, and fabricating them would be a lie told to
 *    someone about to spend on a house. The trust strip states things that are
 *    actually true instead — the plan is free, there is no sign-up, it works in
 *    Nepali, nothing is a construction drawing.
 *  - The floor plan is in the hero, beside the render. None of the references
 *    can compute one; it is the part of this product that is genuinely
 *    different, so it leads rather than hiding three screens in.
 */
import { el } from '../lib/dom.ts';
import type { StylePack } from '../lib/api.ts';

export interface HomeOptions {
  packs: StylePack[];
  /** Start the flow, optionally with a style already chosen. */
  onStart: (stylePackId?: string) => void;
}

const EXAMPLES = [
  { src: 'examples/ex-wood-exterior.webp', caption: 'Warm Wood · from the road' },
  { src: 'examples/ex-living.webp', caption: 'Living room' },
  { src: 'examples/ex-kitchen.webp', caption: 'Kitchen' },
  { src: 'examples/ex-puja.webp', caption: 'Puja room' },
];

const STEPS = [
  {
    en: 'Tell us about your land',
    ne: 'जग्गाको विवरण दिनुहोस्',
    body: 'Its size in aana, ropani or kattha, and how many rooms you need. Type it in your own words, or tap through the choices.',
  },
  {
    en: 'See your floor plan',
    ne: 'नक्सा हेर्नुहोस्',
    body: 'A drawn plan for every storey, to scale, inside the setbacks. This part is free and appears straight away.',
  },
  {
    en: 'See how it could look',
    ne: 'कस्तो देखिन्छ हेर्नुहोस्',
    body: 'The house from the road in daylight and at dusk, and a view of each main room, in the style you picked.',
  },
];

const FACTS = [
  { en: 'The floor plan is free', ne: 'नक्सा निःशुल्क' },
  { en: 'No sign-up to start', ne: 'दर्ता चाहिँदैन' },
  { en: 'Nepali and English', ne: 'नेपाली र अङ्ग्रेजी' },
  { en: 'Works on a phone', ne: 'मोबाइलमा चल्छ' },
];

const FAQ = [
  {
    q: 'Is this really free?',
    a: 'The floor plan is, every time, with no account. Generating the pictures of the house costs us money, so that is a separate button you choose to press — and if we reach our limit for the day we will say so and take your number instead.',
  },
  {
    q: 'Can I build from this?',
    a: 'No, and please do not try. These are indicative layouts to help you decide what you want before you commit. The setbacks here are sensible starting values, not your municipality’s bylaw, and the structure, services and approvals are your engineer’s to determine. Bring the plan to us and we will do it properly.',
  },
  {
    q: 'What if my land is an odd shape?',
    a: 'Give the frontage and depth and we will work to that. For anything irregular the plan will be approximate — it is still useful for working out how many rooms fit, which is the question most people actually have.',
  },
  {
    q: 'What happens to my photos?',
    a: 'Location data is stripped from every photo before it is stored or sent anywhere, and uploads are deleted after 30 days. A photo of your plot otherwise carries the coordinates of your plot.',
  },
];

export function home({ packs, onStart }: HomeOptions): HTMLElement {
  const primary = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'button',
    text: 'Design my house — free',
  });
  primary.addEventListener('click', () => onStart());

  const secondary = el('button', {
    class: 'sgv__btn sgv__btn--lg',
    type: 'button',
    text: 'See how it works',
  });
  secondary.addEventListener('click', () => {
    document.getElementById('sgv-how')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  return el('div', { class: 'sgv__home' }, [
    hero(primary, secondary),
    factStrip(),
    styleStarters(packs, onStart),
    howItWorks(),
    gallery(),
    faq(),
    closing(onStart),
  ]);
}

/**
 * The pair is the pitch: a plan that fits the plot, and the house it becomes.
 * Shown at rest, not behind an interaction.
 */
function hero(primary: HTMLElement, secondary: HTMLElement): HTMLElement {
  return el('section', { class: 'sgv__hero2' }, [
    el('div', { class: 'sgv__hero2-copy' }, [
      el('p', { class: 'sgv__kicker', text: 'Shailakshya Griha Nirman' }),
      el('h1', {}, [
        'See your house before you build it',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'बनाउनु अघि आफ्नो घर हेर्नुहोस्' }),
      ]),
      el('p', { class: 'sgv__lead' }, [
        'Tell us how big your land is and what you need. We work out a house that fits, draw the plan for every floor, and show you what it could look like.',
      ]),
      el('div', { class: 'sgv__hero2-actions' }, [primary, secondary]),
      el('p', { class: 'sgv__hint' }, [
        'Takes about a minute. No account needed.',
        el('span', { class: 'ne', lang: 'ne', text: ' एक मिनेटमा। खाता चाहिँदैन।' }),
      ]),
    ]),
    el('div', { class: 'sgv__hero2-figures' }, [
      el('figure', { class: 'sgv__hero2-shot' }, [
        el('img', {
          src: 'examples/ex-brick-exterior.webp',
          alt: 'A two storey brick house in the Kathmandu valley, generated from a plan',
          width: '900',
          height: '600',
          fetchpriority: 'high',
          decoding: 'async',
        }),
        el('figcaption', { text: 'The house' }),
      ]),
      el('figure', { class: 'sgv__hero2-shot sgv__hero2-shot--plan' }, [
        el('img', {
          src: 'examples/ex-plan-ground.svg',
          alt: 'A ground floor plan drawn to scale, with room names and sizes',
          loading: 'lazy',
          decoding: 'async',
        }),
        el('figcaption', { text: 'Its ground floor · 4 aana' }),
      ]),
    ]),
  ]);
}

function factStrip(): HTMLElement {
  return el(
    'ul',
    { class: 'sgv__facts' },
    FACTS.map((fact) =>
      el('li', { class: 'sgv__fact' }, [
        fact.en,
        el('span', { class: 'sgv__fact-ne', lang: 'ne', text: fact.ne }),
      ]),
    ),
  );
}

/** A style card is a way in, not a form field. */
function styleStarters(packs: StylePack[], onStart: (id?: string) => void): HTMLElement {
  return el('section', { class: 'sgv__band' }, [
    el('div', { class: 'sgv__shell' }, [
      el('h2', {}, [
        'Start with a style',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'शैलीबाट सुरु गर्नुहोस्' }),
      ]),
      el('p', { class: 'sgv__lead' }, [
        'Pick the look you have in mind and we will carry it through. You can change it later.',
      ]),
      el(
        'div',
        { class: 'sgv__starters' },
        packs.slice(0, 6).map((pack) => {
          const card = el('button', {
            class: 'sgv__starter',
            type: 'button',
            '--swatch': pack.swatch,
          }, [
            el('span', { class: 'sgv__starter-face' }, [
              (() => {
                const img = el('img', { alt: '', loading: 'lazy', decoding: 'async' });
                const sources = [`reference/${pack.id}.webp`, `reference/${pack.id}.svg`];
                let i = 0;
                const next = () => {
                  const src = sources[i++];
                  if (src) img.src = src;
                  else img.remove();
                };
                img.addEventListener('error', next);
                next();
                return img;
              })(),
            ]),
            el('span', { class: 'sgv__starter-name' }, [
              pack.nameEn,
              el('span', { class: 'sgv__starter-ne', lang: 'ne', text: pack.nameNe }),
            ]),
          ]);
          card.addEventListener('click', () => onStart(pack.id));
          return card;
        }),
      ),
    ]),
  ]);
}

/** Three genuinely sequential steps, so numbering them says something true. */
function howItWorks(): HTMLElement {
  return el('section', { class: 'sgv__shell sgv__section', id: 'sgv-how' }, [
    el('h2', {}, [
      'How it works',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'कसरी काम गर्छ' }),
    ]),
    el(
      'ol',
      { class: 'sgv__steps' },
      STEPS.map((step, index) =>
        el('li', { class: 'sgv__step' }, [
          el('span', { class: 'sgv__step-n', 'aria-hidden': 'true', text: String(index + 1) }),
          el('div', {}, [
            el('h3', {}, [
              step.en,
              el('span', { class: 'sgv__ne', lang: 'ne', text: step.ne }),
            ]),
            el('p', { text: step.body }),
          ]),
        ]),
      ),
    ),
  ]);
}

function gallery(): HTMLElement {
  return el('section', { class: 'sgv__band' }, [
    el('div', { class: 'sgv__shell' }, [
      el('h2', {}, [
        'What comes back',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'के प्राप्त हुन्छ' }),
      ]),
      el('p', { class: 'sgv__lead' }, [
        'The house from the road, and a view of each main room. These are real results from this tool.',
      ]),
      el(
        'div',
        { class: 'sgv__gallery' },
        EXAMPLES.map((example) =>
          el('figure', { class: 'sgv__shot' }, [
            el('img', {
              src: example.src,
              alt: example.caption,
              loading: 'lazy',
              decoding: 'async',
            }),
            el('figcaption', { text: example.caption }),
          ]),
        ),
      ),
      el('p', { class: 'sgv__hint' }, [
        'Visualization only — not a construction specification. ',
        el('span', { class: 'ne', lang: 'ne', text: 'यो केवल कल्पना हो — निर्माण नक्सा होइन।' }),
      ]),
    ]),
  ]);
}

/** Native details/summary: keyboard and screen-reader correct with no JS. */
function faq(): HTMLElement {
  return el('section', { class: 'sgv__shell sgv__section' }, [
    el('h2', {}, [
      'Questions people ask',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'प्रायः सोधिने प्रश्न' }),
    ]),
    el(
      'div',
      { class: 'sgv__faq' },
      FAQ.map((item) =>
        el('details', { class: 'sgv__faq-item' }, [
          el('summary', { text: item.q }),
          el('p', { text: item.a }),
        ]),
      ),
    ),
  ]);
}

function closing(onStart: (id?: string) => void): HTMLElement {
  const button = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'button',
    text: 'Design my house — free',
  });
  button.addEventListener('click', () => onStart());

  return el('section', { class: 'sgv__closing' }, [
    el('div', { class: 'sgv__shell' }, [
      el('h2', {}, [
        'What will fit on your land?',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंको जग्गामा के अट्छ?' }),
      ]),
      el('p', {}, [
        'Find out in about a minute, before you talk to anyone.',
      ]),
      button,
    ]),
  ]);
}

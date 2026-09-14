/**
 * The home page.
 *
 * The tool is the hero. A visitor lands on a prompt bar they can type into
 * immediately — sixty per cent of the width, on the left where reading starts —
 * with a finished house beside it so the promise and the input sit in one
 * glance. Underneath are whole example briefs, because the hard part is not
 * finding the box, it is knowing what to put in it. Everything below the fold
 * exists to answer "what will I get" and "what does it cost" — it is not the
 * way in.
 *
 * Shape follows the tools in this category (ideal.house, maket.ai, openart):
 * bright ground, output shown early, one obvious action, objections answered in
 * an FAQ. Two departures, both deliberate:
 *
 *  - No invented social proof. Those pages open with user counts and press
 *    logos. We have neither, and inventing them for someone about to spend on a
 *    house is a lie with consequences. The strip states true things instead.
 *  - The floor plan is shown beside the render. None of the references can
 *    compute one; it is what makes this product different.
 */
import { el } from '../lib/dom.ts';
import type { StylePack } from '../lib/api.ts';

export interface HomeOptions {
  packs: StylePack[];
  /** Start the flow. Carries the typed prompt and/or a chosen style. */
  onStart: (options: { prompt?: string; stylePackId?: string }) => void;
}

const DEVANAGARI = /[\u0900-\u097F]/;

/**
 * How to talk to it.
 *
 * The previous version offered chips that appended a fragment — "4 aana",
 * "2.5 storey" — and they read as nonsense: half a sentence pasted into a box,
 * with no hint of what a finished brief looks like. These are whole briefs
 * instead. Tapping one fills the bar completely, so the first thing a visitor
 * sees is a well-formed request they can then edit into their own.
 *
 * One is written in Nepali, one in romanised Nepali and two in English,
 * because that is genuinely the range the parser accepts and people need
 * permission to type the way they speak.
 */
const SAMPLE_PROMPTS: Array<{ text: string; lang?: string; note: string }> = [
  {
    text: '4 aana in Bhaktapur, road on the east, 3 bedrooms and a puja room',
    note: 'Land, road side, rooms',
  },
  {
    text: 'साढे दुई तले घर, ३ शयनकक्ष, माथि छुट्टै भाडाको फ्ल्याट, इँटाको अनुहार',
    lang: 'ne',
    note: 'नेपालीमा लेख्न सकिन्छ',
  },
  {
    text: '40 by 60 feet jagga, single storey bungalow, thulo kitchen',
    note: 'Mixed Nepali and English is fine',
  },
  {
    text: '8 aana corner plot, modern flat roof, 4 bedrooms all attached',
    note: 'Say the style if you have one',
  },
];

/** The rest of what one run returns, shown small beside the hero shot. */
const ALSO = [
  'examples/ex-plan-ground.svg',
  'examples/ex-living.webp',
  'examples/ex-kitchen.webp',
];

const EXAMPLES = [
  { src: 'examples/ex-wood-exterior.webp', caption: 'From the road' },
  { src: 'examples/ex-living.webp', caption: 'Living room' },
  { src: 'examples/ex-kitchen.webp', caption: 'Kitchen' },
  { src: 'examples/ex-puja.webp', caption: 'Puja room' },
];

const STEPS = [
  {
    en: 'Say what you want',
    ne: 'के चाहिन्छ भन्नुहोस्',
    body: 'Land size, storeys, rooms — in Nepali or English, however you would say it out loud. Or add a photo of your plot or your map.',
    wash: 'var(--saffron-wash)',
  },
  {
    en: 'Get your floor plan',
    ne: 'नक्सा पाउनुहोस्',
    body: 'A drawn plan for every storey, to scale, inside the setbacks — and a straight answer if what you asked for will not fit.',
    wash: 'var(--sky-wash)',
  },
  {
    en: 'See the house',
    ne: 'घर हेर्नुहोस्',
    body: 'The house from the road in daylight and at dusk, and a view of each main room, in the style you picked.',
    wash: 'var(--wash-mint)',
  },
];

const FACTS = [
  { en: 'Floor plan is free', ne: 'नक्सा निःशुल्क' },
  { en: 'Nepali and English', ne: 'नेपाली र अङ्ग्रेजी' },
  { en: 'Ready in a minute', ne: 'एक मिनेटमा' },
  { en: 'Works on a phone', ne: 'मोबाइलमा चल्छ' },
];

const FAQ = [
  {
    q: 'Is this really free?',
    a: 'The floor plan is, every time. Generating the pictures costs us money, so if we hit our limit for the day we will say so and take your number instead of quietly failing.',
  },
  {
    q: 'Can I build from this?',
    a: 'No, and please do not try. These are indicative layouts to help you decide what you want before you commit. The setbacks are sensible starting values, not your municipality’s bylaw, and the structure, services and approvals are your engineer’s to determine. Bring the plan to us and we will do it properly.',
  },
  {
    q: 'What if my land is an odd shape?',
    a: 'Give the frontage and depth and we will work to that. For anything irregular the plan will be approximate — still useful for working out how many rooms fit, which is the question most people actually have.',
  },
  {
    q: 'What happens to my photos?',
    a: 'Location data is stripped from every photo before it is stored or sent anywhere, and uploads are deleted after 30 days. A photo of your plot otherwise carries the coordinates of your plot.',
  },
];

export function home({ packs, onStart }: HomeOptions): HTMLElement {
  return el('div', { class: 'sgv__home' }, [
    hero(onStart),
    proofStrip(),
    howItWorks(),
    styleStarters(packs, onStart),
    gallery(),
    faq(),
    closing(),
  ]);
}

// ---------------------------------------------------------------------------

function hero(onStart: HomeOptions['onStart']): HTMLElement {
  const input = el('textarea', {
    class: 'sgv__prompt-input',
    id: 'sgv-prompt',
    rows: '2',
    placeholder: '4 aana in Bhaktapur, 3 bedrooms and a puja room…',
    'aria-label': 'Describe the house you want',
  });

  // Grows with the sentence rather than making people scroll a two-line box.
  const autosize = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
  };
  input.addEventListener('input', autosize);

  const go = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__prompt-go',
    type: 'submit',
    text: 'Design it',
  });

  const bar = el('form', { class: 'sgv__prompt' }, [
    input,
    el('div', { class: 'sgv__prompt-actions' }, [go]),
  ]);

  bar.addEventListener('submit', (event) => {
    event.preventDefault();
    onStart({ prompt: input.value.trim() || undefined });
  });

  // Enter sends; Shift+Enter for a new line, as people expect from a chat box.
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      bar.requestSubmit();
    }
  });

  // Tapping a sample replaces the box rather than appending to it: these are
  // complete briefs, and half of one grafted onto another says nothing.
  const samples = el('div', { class: 'sgv__samples' }, [
    el('p', { class: 'sgv__samples-label' }, [
      'Not sure how to say it? Tap one and change it',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'कसरी लेख्ने? कुनै एउटा छान्नुहोस्' }),
    ]),
    el(
      'ul',
      { class: 'sgv__sample-list' },
      SAMPLE_PROMPTS.map((sample) => {
        const button = el('button', { class: 'sgv__sample', type: 'button' }, [
          el('span', { class: 'sgv__sample-mark', 'aria-hidden': 'true', text: '“' }),
          el('span', { class: 'sgv__sample-body' }, [
            el('span', { class: 'sgv__sample-text', lang: sample.lang, text: sample.text }),
            el('span', {
              class: 'sgv__sample-note',
              lang: DEVANAGARI.test(sample.note) ? 'ne' : undefined,
              text: sample.note,
            }),
          ]),
          el('span', { class: 'sgv__sample-use', 'aria-hidden': 'true', text: 'Use' }),
        ]);

        button.addEventListener('click', () => {
          input.value = sample.text;
          autosize();
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        });

        return el('li', {}, [button]);
      }),
    ),
  ]);

  return el('section', { class: 'sgv__hero' }, [
    el('div', { class: 'sgv__hero-inner' }, [
      el('div', { class: 'sgv__hero-copy' }, [
        el('p', { class: 'sgv__kicker' }, [
          el('span', { class: 'sgv__kicker-dot', 'aria-hidden': 'true' }),
          'Shailakshya Griha Nirman',
          el('span', { class: 'sgv__kicker-ne', lang: 'ne', text: 'शैलाक्ष्य गृह निर्माण' }),
        ]),
        el('h1', {}, [
          'What will fit on ',
          el('em', { text: 'your' }),
          ' land?',
          el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंको जग्गामा कस्तो घर बन्छ?' }),
        ]),
        el('p', { class: 'sgv__hero-sub' }, ['Describe it, and we draw the plan.']),
        bar,
        samples,
        el('p', { class: 'sgv__hero-note' }, [
          'Free · Nepali or English · ',
          el('span', { class: 'ne', lang: 'ne', text: 'नेपालीमा पनि' }),
        ]),
      ]),
      heroArt(),
    ]),
  ]);
}

/**
 * The right-hand column: one finished house, and the sentence that produced it.
 *
 * Pairing the picture with its prompt is the second half of teaching people how
 * to ask — the samples show the grammar, this shows the payoff. The marigold
 * garland over the frame is the sayapatri strung above a doorway at Tihar; it
 * is the one ornament on the page, and it belongs on a house.
 */
function heroArt(): HTMLElement {
  return el('div', { class: 'sgv__hero-art' }, [
    el('span', { class: 'sgv__garland', 'aria-hidden': 'true' }),
    el('figure', { class: 'sgv__hero-shot' }, [
      el('img', {
        src: 'examples/ex-brick-exterior.webp',
        alt: 'A brick-faced two and a half storey house seen from the road, with a parking bay and a terrace above',
        width: '1024',
        height: '683',
        decoding: 'async',
        fetchpriority: 'high',
      }),
      el('figcaption', { class: 'sgv__hero-caption' }, [
        el('span', { class: 'sgv__hero-caption-label', text: 'From the prompt' }),
        el('span', {
          class: 'sgv__hero-caption-text',
          text: '“4 aana, 2.5 storey, brick face, parking for one”',
        }),
      ]),
    ]),
    el('div', { class: 'sgv__hero-also' }, [
      el(
        'div',
        { class: 'sgv__hero-thumbs', 'aria-hidden': 'true' },
        ALSO.map((src) =>
          el('img', { src, alt: '', loading: 'lazy', decoding: 'async' }),
        ),
      ),
      el('p', {}, [
        '…and every floor plan, and each room inside',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'नक्सा र भित्रका कोठा पनि' }),
      ]),
    ]),
  ]);
}

function proofStrip(): HTMLElement {
  return el('div', { class: 'sgv__proof' }, [
    el('div', { class: 'sgv__proof-inner' }, [
      el(
        'ul',
        { class: 'sgv__facts' },
        FACTS.map((fact) =>
          el('li', { class: 'sgv__fact' }, [
            el('span', { class: 'sgv__fact-tick', 'aria-hidden': 'true', text: '✓' }),
            el('span', {}, [
              fact.en,
              el('span', { class: 'sgv__fact-ne', lang: 'ne', text: fact.ne }),
            ]),
          ]),
        ),
      ),
    ]),
  ]);
}

function howItWorks(): HTMLElement {
  return el('section', { class: 'sgv__shell sgv__section', id: 'sgv-how' }, [
    el('h2', { class: 'sgv__h2-center' }, [
      'Three steps',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'तीन चरण' }),
    ]),
    el(
      'ol',
      { class: 'sgv__steps' },
      STEPS.map((step, index) =>
        el('li', { class: 'sgv__step', '--wash': step.wash }, [
          el('span', { class: 'sgv__step-n', 'aria-hidden': 'true', text: String(index + 1) }),
          el('h3', {}, [step.en, el('span', { class: 'sgv__ne', lang: 'ne', text: step.ne })]),
          el('p', { text: step.body }),
        ]),
      ),
    ),
  ]);
}

function styleStarters(packs: StylePack[], onStart: HomeOptions['onStart']): HTMLElement {
  return el('section', { class: 'sgv__band' }, [
    el('div', { class: 'sgv__shell' }, [
      el('h2', { class: 'sgv__h2-center' }, [
        'Or start from a style',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'वा शैलीबाट सुरु गर्नुहोस्' }),
      ]),
      el(
        'div',
        { class: 'sgv__starters' },
        packs.slice(0, 6).map((pack) => {
          const face = el('span', { class: 'sgv__starter-face', '--swatch': pack.swatch });
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
          face.append(img);

          const card = el('button', { class: 'sgv__starter', type: 'button' }, [
            face,
            el('span', { class: 'sgv__starter-name' }, [
              pack.nameEn,
              el('span', { class: 'sgv__starter-ne', lang: 'ne', text: pack.nameNe }),
            ]),
          ]);
          card.addEventListener('click', () => onStart({ stylePackId: pack.id }));
          return card;
        }),
      ),
    ]),
  ]);
}

function gallery(): HTMLElement {
  return el('section', { class: 'sgv__shell sgv__section' }, [
    el('h2', { class: 'sgv__h2-center' }, [
      'What comes back',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'के प्राप्त हुन्छ' }),
    ]),
    el('p', { class: 'sgv__lead sgv__lead--center' }, [
      'A plan for every floor, the house from the road, and a view of each main room. These are real results from this tool.',
    ]),
    el('div', { class: 'sgv__showcase' }, [
      el('figure', { class: 'sgv__showcase-plan' }, [
        el('img', {
          src: 'examples/ex-plan-ground.svg',
          alt: 'A ground floor plan drawn to scale with room names and sizes',
          loading: 'lazy',
          decoding: 'async',
        }),
        el('figcaption', { text: 'Ground floor · 4 aana · 718 sq ft' }),
      ]),
      el(
        'div',
        { class: 'sgv__showcase-grid' },
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
    ]),
    el('p', { class: 'sgv__hint sgv__hint--center' }, [
      'Visualization only — not a construction specification. ',
      el('span', { class: 'ne', lang: 'ne', text: 'यो केवल कल्पना हो — निर्माण नक्सा होइन।' }),
    ]),
  ]);
}

function faq(): HTMLElement {
  return el('section', { class: 'sgv__band' }, [
    el('div', { class: 'sgv__shell sgv__shell--narrow' }, [
      el('h2', { class: 'sgv__h2-center' }, [
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
    ]),
  ]);
}

/** Sends the reader back to the prompt bar rather than opening a second path. */
function closing(): HTMLElement {
  const button = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'button',
    text: 'Design my house',
  });
  button.addEventListener('click', () => {
    document.getElementById('sgv-prompt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (document.getElementById('sgv-prompt') as HTMLTextAreaElement | null)?.focus();
  });

  return el('section', { class: 'sgv__closing' }, [
    el('div', { class: 'sgv__shell' }, [
      el('h2', {}, [
        'Find out before you commit',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'निर्णय गर्नु अघि थाहा पाउनुहोस्' }),
      ]),
      el('p', {}, ['About a minute, and nothing to sign up for to see your plan.']),
      button,
    ]),
  ]);
}

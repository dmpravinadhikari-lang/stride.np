/**
 * The home page.
 *
 * The tool is the hero. A visitor lands on a prompt bar they can type into
 * immediately, with suggestion capsules underneath so nobody faces an empty
 * box and has to guess what this thing accepts. Everything below the fold
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

/**
 * Three capsules, not fourteen.
 *
 * These are the three things the layout engine cannot work without — how big
 * the land is, how tall the house is, how many bedrooms — so they are the three
 * worth offering. Everything else people can simply type, and a wall of chips
 * made the page harder to start from, not easier.
 *
 * The values are the common case rather than the only case: someone with eight
 * aana taps "4 aana" and edits the number, which is quicker than reading four
 * options.
 */
const CAPSULES: Array<{ label: string; ne: string; add: string }> = [
  { label: '4 aana', ne: '४ आना', add: '4 aana of land' },
  { label: '2.5 storey', ne: 'साढे दुई तले', add: '2.5 storey' },
  { label: '3 bedrooms', ne: '३ शयनकक्ष', add: '3 bedrooms' },
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
    placeholder: '4 aana in Bhaktapur, road on the east, 3 bedrooms and a puja room…',
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

  const capsules = el(
    'div',
    { class: 'sgv__capsules', role: 'group', 'aria-label': 'Add a detail to your description' },
    CAPSULES.map((capsule) => {
      const chip = el('button', {
        class: 'sgv__capsule',
        type: 'button',
      }, [
        capsule.label,
        el('span', { class: 'sgv__capsule-ne', lang: 'ne', text: capsule.ne }),
      ]);

      chip.addEventListener('click', () => {
        const current = input.value.trim();
        input.value = current ? `${current}, ${capsule.add}` : `I have ${capsule.add}`;
        autosize();
        input.focus();
        // Caret to the end, so the next tap appends rather than overwrites.
        input.setSelectionRange(input.value.length, input.value.length);
      });

      return chip;
    }),
  );

  return el('section', { class: 'sgv__hero' }, [
    el('div', { class: 'sgv__hero-inner' }, [
      el('p', { class: 'sgv__kicker' }, [
        el('span', { class: 'sgv__kicker-dot', 'aria-hidden': 'true' }),
        'Shailakshya Griha Nirman',
      ]),
      el('h1', {}, [
        'What will fit on ',
        el('em', { text: 'your' }),
        ' land?',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंको जग्गामा कस्तो घर बन्छ?' }),
      ]),
      el('p', { class: 'sgv__hero-sub' }, [
        'Describe it, and we draw the plan.',
      ]),
      bar,
      capsules,
      el('p', { class: 'sgv__hero-note' }, [
        'Free · Nepali or English · ',
        el('span', { class: 'ne', lang: 'ne', text: 'नेपालीमा पनि' }),
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

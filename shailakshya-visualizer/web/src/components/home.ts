/**
 * The home page.
 *
 * One centred column: the promise, the box you type into, how to type into it,
 * and then what comes back out. Nothing else competes above the fold, because
 * a visitor with an empty plot and a vague idea has exactly one job here and
 * it is to describe what they want.
 *
 * The samples below the box are doing two things at once. They teach the
 * grammar — tap one and it fills the box with a request that works — and they
 * are the portfolio, because "what will I actually get" is the question that
 * decides whether anyone types anything at all. Each card is a real output of
 * this system paired with the sentence that produced it.
 *
 * Two departures from the tools in this category, both deliberate:
 *
 *  - No invented social proof. Those pages open with user counts and press
 *    logos. We have neither, and inventing them for someone about to spend on
 *    a house is a lie with consequences. The strip states true things instead.
 *  - The floor plan leads the samples. None of the references can compute one;
 *    it is what makes this product different from a picture generator.
 */
import { el } from '../lib/dom.ts';
import type { StylePack } from '../lib/api.ts';

export interface HomeOptions {
  packs: StylePack[];
  /** Start the flow. Carries the typed prompt, any files, and/or a style. */
  onStart: (options: { prompt?: string; stylePackId?: string; files?: File[] }) => void;
  /** Skip the prompt and answer the questions directly. */
  onForm: () => void;
}

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
const SAMPLE_PROMPTS: Array<{ text: string; lang?: string }> = [
  {
    text: '4 aana in Bhaktapur, road on the east, 3 bedrooms and a puja room',
  },
  {
    text: 'साढे दुई तले घर, ३ शयनकक्ष, माथि छुट्टै भाडाको फ्ल्याट, इँटाको अनुहार',
    lang: 'ne',
  },
  {
    text: '40 by 60 feet jagga, single storey bungalow, thulo kitchen',
  },
  {
    text: '8 aana corner plot, modern flat roof, 4 bedrooms all attached',
  },
];

/**
 * What comes back, and the sentence that asked for it.
 *
 * Every one of these is a real output of this system, not a stock photograph
 * and not a competitor's render. The brief under each is what produced it, and
 * tapping the card puts that brief in the box — so the row is the portfolio
 * and the tutorial at the same time.
 *
 * The floor plan leads because it is the part no picture generator can do, and
 * the part that answers the question people actually arrive with.
 */
const SAMPLES: Array<{
  src: string;
  label: string;
  ne: string;
  brief: string;
  lead?: boolean;
  contain?: boolean;
}> = [
  {
    src: 'examples/ex-plan-ground.svg',
    label: 'Every floor, drawn to scale',
    ne: 'नापसहितको नक्सा',
    brief: '4 aana in Bhaktapur, road on the east, 3 bedrooms and a puja room',
    lead: true,
    contain: true,
  },
  {
    src: 'examples/ex-brick-exterior.webp',
    label: 'The house from the road',
    ne: 'सडकबाट घर',
    brief: '4 aana, 2.5 storey, brick face, parking for one car',
  },
  {
    src: 'examples/ex-living.webp',
    label: 'Living room',
    ne: 'बैठक कोठा',
    brief: '8 aana corner plot, big living room, warm wood finish, 4 bedrooms',
  },
  {
    src: 'examples/ex-kitchen.webp',
    label: 'Kitchen',
    ne: 'भान्सा',
    brief: '40 by 60 feet jagga, single storey bungalow, thulo modern kitchen',
  },
  {
    src: 'examples/ex-puja.webp',
    label: 'Puja room',
    ne: 'पूजा कोठा',
    brief: 'साढे दुई तले घर, ३ शयनकक्ष, पूजा कोठा पूर्वतर्फ, परम्परागत नेवारी शैली',
  },
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

export function home({ packs, onStart, onForm }: HomeOptions): HTMLElement {
  return el('div', { class: 'sgv__home' }, [
    hero(onStart, onForm),
    samples(onStart),
    proofStrip(),
    howItWorks(),
    styleStarters(packs, onStart),
    faq(),
    closing(),
  ]);
}

// ---------------------------------------------------------------------------

function hero(onStart: HomeOptions['onStart'], onForm: HomeOptions['onForm']): HTMLElement {
  const input = el('textarea', {
    class: 'sgv__prompt-input',
    id: 'sgv-prompt',
    rows: '2',
    placeholder: 'Describe your land and what you need…',
    'aria-label': 'Describe the house you want',
  });

  // Grows with the sentence rather than making people scroll a two-line box.
  const autosize = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 240)}px`;
  };
  input.addEventListener('input', autosize);

  // A photo of the plot, or a survey map. Files ride along with the sentence;
  // the parser reads both together.
  let attached: File[] = [];
  const picker = el('input', {
    type: 'file',
    accept: 'image/*',
    multiple: 'true',
    class: 'sgv__visually-hidden',
  });
  const attachedNote = el('p', { class: 'sgv__prompt-files', hidden: 'true' });

  picker.addEventListener('change', () => {
    attached = Array.from(picker.files ?? []);
    attachedNote.hidden = attached.length === 0;
    attachedNote.textContent = attached.length
      ? `${attached.length} file${attached.length > 1 ? 's' : ''} attached · ${attached
          .map((file) => file.name)
          .join(', ')}`
      : '';
  });

  const attach = toolButton(
    'Add a photo of your land or your map',
    '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  );
  attach.addEventListener('click', () => picker.click());

  const form = toolButton(
    'Answer the questions instead',
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="7" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="17" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/>',
  );
  form.addEventListener('click', onForm);

  const go = el('button', {
    class: 'sgv__prompt-go',
    type: 'submit',
    'aria-label': 'Design my house',
  });
  go.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const bar = el('form', { class: 'sgv__prompt' }, [
    input,
    el('div', { class: 'sgv__prompt-bar' }, [
      el('div', { class: 'sgv__prompt-tools' }, [attach, form, picker]),
      go,
    ]),
  ]);

  bar.addEventListener('submit', (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt && attached.length === 0) {
      input.focus();
      return;
    }
    onStart({ prompt: prompt || undefined, files: attached });
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
  const fill = (text: string) => {
    input.value = text;
    autosize();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  fillPrompt = fill;

  const howToAsk = el('div', { class: 'sgv__asks' }, [
    el('span', { class: 'sgv__asks-label' }, [
      'Say it like this',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'यसरी भन्नुहोस्' }),
    ]),
    el(
      'div',
      { class: 'sgv__ask-row' },
      SAMPLE_PROMPTS.map((sample) => {
        const chip = el('button', { class: 'sgv__ask', type: 'button' }, [
          el('span', { class: 'sgv__ask-text', lang: sample.lang, text: sample.text }),
        ]);
        chip.addEventListener('click', () => fill(sample.text));
        return chip;
      }),
    ),
  ]);

  return el('section', { class: 'sgv__hero' }, [
    el('div', { class: 'sgv__hero-inner' }, [
      el('p', { class: 'sgv__kicker' }, [
        el('span', { class: 'sgv__kicker-dot', 'aria-hidden': 'true' }),
        'Shailakshya Griha Nirman',
        el('span', { class: 'sgv__kicker-ne', lang: 'ne', text: 'शैलाक्ष्य गृह निर्माण' }),
      ]),
      el('h1', {}, [
        'Make your dream house in ',
        el('em', { text: 'seconds' }),
        '.',
      ]),
      el('p', { class: 'sgv__hero-ne', lang: 'ne', text: 'सपनाको घर, केही सेकेन्डमै।' }),
      el('p', { class: 'sgv__hero-sub' }, [
        'Tell us about your land and what you need. Get the floor plan for every storey, the house from the road, and a look inside each room.',
      ]),
      bar,
      attachedNote,
      howToAsk,
      el('p', { class: 'sgv__hero-note' }, [
        'Floor plan free, every time · Nepali or English · ',
        el('span', { class: 'ne', lang: 'ne', text: 'नेपालीमा पनि' }),
      ]),
    ]),
  ]);
}

/** Set by the hero so a sample card lower down can fill the same box. */
let fillPrompt: ((text: string) => void) | undefined;

function toolButton(label: string, path: string): HTMLButtonElement {
  const button = el('button', {
    class: 'sgv__tool',
    type: 'button',
    title: label,
    'aria-label': label,
  });
  button.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">${path}</svg>`;
  return button;
}

/**
 * The portfolio row: what one run gives back, each card tagged with the brief
 * that produced it. Tapping a card loads that brief, so browsing turns into
 * typing without anybody having to invent a sentence from nothing.
 */
function samples(onStart: HomeOptions['onStart']): HTMLElement {
  return el('section', { class: 'sgv__shell sgv__samples-band' }, [
    el('span', { class: 'sgv__garland', 'aria-hidden': 'true' }),
    el('div', { class: 'sgv__samples-head' }, [
      el('h2', {}, [
        'What comes back',
        el('span', { class: 'sgv__ne', lang: 'ne', text: 'के प्राप्त हुन्छ' }),
      ]),
      el('p', {}, ['Real results from this tool. Tap one to load the brief that made it.']),
    ]),
    el(
      'div',
      { class: 'sgv__cards' },
      SAMPLES.map((sample) => {
        const card = el(
          'button',
          {
            class: `sgv__card${sample.lead ? ' sgv__card--lead' : ''}`,
            type: 'button',
            title: sample.brief,
          },
          [
            el('span', { class: `sgv__card-face${sample.contain ? ' sgv__card-face--fit' : ''}` }, [
              el('img', {
                src: sample.src,
                alt: sample.label,
                loading: 'lazy',
                decoding: 'async',
              }),
            ]),
            sample.lead
              ? el('span', { class: 'sgv__card-badge', text: 'FREE' })
              : null,
            el('span', { class: 'sgv__card-label' }, [
              sample.label,
              el('span', { class: 'sgv__card-ne', lang: 'ne', text: sample.ne }),
            ]),
          ],
        );

        card.addEventListener('click', () => {
          if (fillPrompt) fillPrompt(sample.brief);
          else onStart({ prompt: sample.brief });
        });

        return card;
      }),
    ),
    el('p', { class: 'sgv__hint' }, [
      'Visualization only — not a construction specification. ',
      el('span', { class: 'ne', lang: 'ne', text: 'यो केवल कल्पना हो — निर्माण नक्सा होइन।' }),
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

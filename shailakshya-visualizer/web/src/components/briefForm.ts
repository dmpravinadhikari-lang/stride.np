/**
 * The brief: land and requirements.
 *
 * This is the whole product in one screen, so it has to be answerable by
 * somebody standing on their plot with a phone, who knows their land in aana
 * and has never used a design tool. Everything therefore has a working default
 * and nothing is a free-text box.
 *
 * Counts use plus/minus steppers rather than typed numbers: a stepper is one
 * tap on a phone, cannot be given a nonsense value, and needs no validation
 * message. Land area accepts the units people actually use.
 */
import { el } from '../lib/dom.ts';
import type { Brief, LandUnit, StylePack } from '../lib/api.ts';
import { styleGrid } from './styleGrid.ts';

const UNITS: Array<{ id: LandUnit; label: string }> = [
  { id: 'aana', label: 'aana · आना' },
  { id: 'ropani', label: 'ropani · रोपनी' },
  { id: 'paisa', label: 'paisa · पैसा' },
  { id: 'kattha', label: 'kattha · कट्ठा' },
  { id: 'dhur', label: 'dhur · धुर' },
  { id: 'bigha', label: 'bigha · बिघा' },
  { id: 'sqft', label: 'sq ft · वर्ग फिट' },
  { id: 'sqm', label: 'sq m · वर्ग मिटर' },
];

const ROAD_SIDES: Array<{ id: Brief['land']['roadSide']; en: string; ne: string }> = [
  { id: 'north', en: 'North', ne: 'उत्तर' },
  { id: 'east', en: 'East', ne: 'पूर्व' },
  { id: 'south', en: 'South', ne: 'दक्षिण' },
  { id: 'west', en: 'West', ne: 'पश्चिम' },
];

export interface BriefFormOptions {
  packs: StylePack[];
  onSubmit: (brief: Brief) => void;
}

export function briefForm({ packs, onSubmit }: BriefFormOptions): HTMLElement {
  // Defaults describe an ordinary Kathmandu family house, so the form is
  // already answerable by pressing the button.
  const state: Brief = {
    land: { area: { value: 4, unit: 'aana' }, roadSide: 'south' },
    requirements: {
      floors: 2,
      bedrooms: 3,
      attachedBathrooms: 1,
      parkingCars: 1,
      kitchen: true,
      living: true,
      dining: true,
      puja: true,
      store: false,
      stylePackId: packs[0]?.id ?? 'modern-minimal',
    },
  };

  // --- land ---------------------------------------------------------------

  const areaInput = el('input', {
    class: 'sgv__input',
    type: 'number',
    min: '0.5',
    step: '0.5',
    value: '4',
    id: 'sgv-area',
    inputmode: 'decimal',
  });
  areaInput.addEventListener('input', () => {
    state.land.area = {
      value: Number(areaInput.value) || 0,
      unit: (unitSelect.value as LandUnit) ?? 'aana',
    };
  });

  const unitSelect = el(
    'select',
    { class: 'sgv__input sgv__input--unit', 'aria-label': 'Land unit' },
    UNITS.map((u) => el('option', { value: u.id, text: u.label })),
  );
  unitSelect.value = 'aana';
  unitSelect.addEventListener('change', () => {
    state.land.area = { value: Number(areaInput.value) || 0, unit: unitSelect.value as LandUnit };
  });

  const widthInput = dimension('Frontage on the road', 'सडकतर्फको चौडाइ', (v) => {
    state.land.widthFt = v;
  });
  const depthInput = dimension('Depth', 'गहिराइ', (v) => {
    state.land.depthFt = v;
  });

  const roadButtons: HTMLButtonElement[] = [];
  const roadPicker = el(
    'div',
    { class: 'sgv__choice', role: 'group', 'aria-label': 'Which side is the road' },
    ROAD_SIDES.map((side) => {
      const button = el('button', {
        class: 'sgv__chip',
        type: 'button',
        'aria-pressed': String(side.id === 'south'),
      }, [side.en, el('span', { class: 'sgv__chip-ne', lang: 'ne', text: side.ne })]);

      button.addEventListener('click', () => {
        state.land.roadSide = side.id;
        for (const other of roadButtons) other.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-pressed', 'true');
      });

      roadButtons.push(button);
      return button;
    }),
  );

  // --- requirements -------------------------------------------------------

  const bathStepper = stepper('Bedrooms with own bathroom', 'आफ्नै बाथरुम भएका', 1, 0, 6, (v) => {
    state.requirements.attachedBathrooms = v;
  });

  const bedStepper = stepper('Bedrooms', 'शयनकक्ष', 3, 1, 8, (v) => {
    state.requirements.bedrooms = v;
    // Attached bathrooms cannot outnumber bedrooms; keep the pair coherent
    // instead of letting the server quietly clamp it.
    bathStepper.setMax(v);
  });

  const requirementGrid = el('div', { class: 'sgv__fields' }, [
    stepper('Floors', 'तला', 2, 1, 5, (v) => {
      state.requirements.floors = v;
    }).node,
    bedStepper.node,
    bathStepper.node,
    stepper('Car parking', 'कार पार्किङ', 1, 0, 3, (v) => {
      state.requirements.parkingCars = v;
    }).node,
  ]);

  const extras = el('div', { class: 'sgv__choice' }, [
    toggle('Living room', 'बैठक', true, (v) => { state.requirements.living = v; }),
    toggle('Kitchen', 'भान्सा', true, (v) => { state.requirements.kitchen = v; }),
    toggle('Dining', 'भोजन कक्ष', true, (v) => { state.requirements.dining = v; }),
    toggle('Puja room', 'पूजा कोठा', true, (v) => { state.requirements.puja = v; }),
    toggle('Store', 'भण्डार', false, (v) => { state.requirements.store = v; }),
  ]);

  // --- submit -------------------------------------------------------------

  const submit = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'submit',
    text: 'Design my house',
  });

  const form = el('form', { class: 'sgv__form' }, [
    section('Your land', 'तपाईंको जग्गा', [
      el('div', { class: 'sgv__field' }, [
        el('label', { class: 'sgv__label', for: 'sgv-area' }, [
          'Land area',
          el('span', { class: 'sgv__label-ne', lang: 'ne', text: 'जग्गाको क्षेत्रफल' }),
        ]),
        el('div', { class: 'sgv__inline' }, [areaInput, unitSelect]),
      ]),
      el('div', { class: 'sgv__fields' }, [widthInput, depthInput]),
      el('p', { class: 'sgv__hint' }, [
        'Leave the measurements blank if you do not know them — we will assume a normal plot shape for the area you gave.',
      ]),
      el('div', { class: 'sgv__field' }, [
        el('span', { class: 'sgv__label' }, [
          'Which side is the road on?',
          el('span', { class: 'sgv__label-ne', lang: 'ne', text: 'सडक कुन तर्फ छ?' }),
        ]),
        roadPicker,
      ]),
    ]),

    section('What you need', 'तपाईंलाई के चाहिन्छ', [
      requirementGrid,
      el('div', { class: 'sgv__field' }, [
        el('span', { class: 'sgv__label' }, [
          'Also include',
          el('span', { class: 'sgv__label-ne', lang: 'ne', text: 'यी पनि चाहिन्छ' }),
        ]),
        extras,
      ]),
    ]),

    section('Style', 'शैली', [
      packs.length > 0
        ? styleGrid({
            packs,
            onSelect: (pack) => {
              state.requirements.stylePackId = pack.id;
            },
          })
        : el('p', { class: 'sgv__hint', text: 'Styles could not be loaded. Please refresh.' }),
    ]),

    el('div', { class: 'sgv__submit' }, [
      submit,
      el('p', { class: 'sgv__hint' }, [
        'The floor plan is free and appears straight away. ',
        el('span', { class: 'ne', lang: 'ne', text: 'नक्सा निःशुल्क छ र तुरुन्तै देखिन्छ।' }),
      ]),
    ]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // Pre-select the first style if the visitor never touched the cards.
    onSubmit(structuredClone(state));
  });

  return form;
}

// ---------------------------------------------------------------------------

function section(titleEn: string, titleNe: string, children: HTMLElement[]): HTMLElement {
  return el('fieldset', { class: 'sgv__section-block' }, [
    el('legend', { class: 'sgv__legend' }, [
      titleEn,
      el('span', { class: 'sgv__label-ne', lang: 'ne', text: titleNe }),
    ]),
    ...children,
  ]);
}

function dimension(labelEn: string, labelNe: string, onChange: (v: number | undefined) => void) {
  const id = `sgv-${labelEn.replace(/\W+/g, '-').toLowerCase()}`;
  const input = el('input', {
    class: 'sgv__input',
    type: 'number',
    min: '0',
    step: '1',
    placeholder: 'optional',
    inputmode: 'numeric',
    id,
  });

  input.addEventListener('input', () => {
    const value = Number(input.value);
    onChange(Number.isFinite(value) && value > 0 ? value : undefined);
  });

  return el('div', { class: 'sgv__field' }, [
    el('label', { class: 'sgv__label', for: id }, [
      labelEn,
      el('span', { class: 'sgv__label-ne', lang: 'ne', text: `${labelNe} (ft)` }),
    ]),
    input,
  ]);
}

interface Stepper {
  node: HTMLElement;
  setMax: (max: number) => void;
}

function stepper(
  labelEn: string,
  labelNe: string,
  initial: number,
  min: number,
  max: number,
  onChange: (v: number) => void,
): Stepper {
  let value = initial;
  let ceiling = max;

  const output = el('output', { class: 'sgv__stepper-value', text: String(value) });

  const set = (next: number) => {
    value = Math.max(min, Math.min(ceiling, next));
    output.textContent = String(value);
    onChange(value);
  };

  const button = (sign: -1 | 1, glyph: string) => {
    const b = el('button', {
      class: 'sgv__stepper-btn',
      type: 'button',
      'aria-label': `${sign < 0 ? 'Fewer' : 'More'} ${labelEn.toLowerCase()}`,
      text: glyph,
    });
    b.addEventListener('click', () => set(value + sign));
    return b;
  };

  const node = el('div', { class: 'sgv__field' }, [
    el('span', { class: 'sgv__label' }, [
      labelEn,
      el('span', { class: 'sgv__label-ne', lang: 'ne', text: labelNe }),
    ]),
    el('div', { class: 'sgv__stepper' }, [button(-1, '−'), output, button(1, '+')]),
  ]);

  return {
    node,
    setMax: (next: number) => {
      ceiling = next;
      if (value > ceiling) set(ceiling);
    },
  };
}

function toggle(
  labelEn: string,
  labelNe: string,
  on: boolean,
  onChange: (v: boolean) => void,
): HTMLButtonElement {
  const button = el('button', {
    class: 'sgv__chip',
    type: 'button',
    'aria-pressed': String(on),
  }, [labelEn, el('span', { class: 'sgv__chip-ne', lang: 'ne', text: labelNe })]);

  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(next));
    onChange(next);
  });

  return button;
}

/**
 * The answer: floor plans first, pictures second.
 *
 * The order matters commercially. The plan is free, instant and is the thing
 * that actually tells the customer whether their brief fits their land, so it
 * leads. The renders cost money and take twenty seconds, so they are a separate
 * button the customer chooses to press — which also means a visitor who only
 * wanted to know "do four bedrooms fit on my four aana" costs nothing at all.
 */
import { el } from '../lib/dom.ts';
import type { PlanResponse, VisualsResponse } from '../lib/api.ts';

export interface PlanResultOptions {
  result: PlanResponse;
  onVisuals: (mount: HTMLElement) => void;
  onRestart: () => void;
}

const ROOM_LABELS: Record<string, string> = {
  exterior: 'The house',
  living: 'Living room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  puja: 'Puja room',
};

export function planResult({ result, onVisuals, onRestart }: PlanResultOptions): HTMLElement {
  const { plan, floors } = result;

  const summary = el('div', { class: 'sgv__summary' }, [
    stat('Land', plan.plot.areaLabel, `${plan.plot.widthFt.toFixed(0)}′ × ${plan.plot.depthFt.toFixed(0)}′`),
    stat('Built-up area', `${plan.totals.builtUpSqFt.toLocaleString()} sq ft`, `over ${floors.length} floor${floors.length > 1 ? 's' : ''}`),
    stat('Ground coverage', `${plan.totals.groundCoveragePct}%`, 'of the plot'),
    stat('Rooms', `${plan.totals.bedrooms} bed · ${plan.totals.bathrooms} bath`, ''),
  ]);

  // Floor switcher. Two or three storeys is the normal case, so tabs beat a
  // dropdown here.
  const drawing = el('div', { class: 'sgv__drawing' });
  const tabs = el('div', { class: 'sgv__toggle sgv__toggle--light', role: 'group', 'aria-label': 'Floor' });

  const buttons = floors.map((floor, index) => {
    const button = el('button', {
      type: 'button',
      'aria-pressed': String(index === 0),
      text: floor.nameEn,
    });
    button.addEventListener('click', () => {
      buttons.forEach((other, i) => other.setAttribute('aria-pressed', String(i === index)));
      drawing.innerHTML = floor.svg;
    });
    tabs.append(button);
    return button;
  });

  if (floors[0]) drawing.innerHTML = floors[0].svg;

  const warnings = plan.warnings.length
    ? el('div', { class: `sgv__msg ${plan.fits ? 'sgv__msg--warn' : 'sgv__msg--error'}` }, [
        el('strong', {
          text: plan.fits
            ? 'Worth knowing before you decide'
            : 'This brief does not comfortably fit this land',
        }),
        el('ul', { class: 'sgv__warnlist' }, plan.warnings.map((w) => el('li', { text: w }))),
      ])
    : el('div', { class: 'sgv__msg sgv__msg--warn' }, [
        el('strong', { text: 'Everything fits comfortably on this plot.' }),
      ]);

  const visualsMount = el('div', { class: 'sgv__visuals' });

  const seeIt = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'button',
    text: 'Show me what it looks like',
  });
  seeIt.addEventListener('click', () => {
    seeIt.disabled = true;
    onVisuals(visualsMount);
  });

  const again = el('button', { class: 'sgv__btn', type: 'button', text: 'Change the brief' });
  again.addEventListener('click', onRestart);

  return el('div', { class: 'sgv__shell sgv__section' }, [
    el('h2', {}, [
      'Your house',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंको घर' }),
    ]),
    summary,
    warnings,
    el('div', { class: 'sgv__drawing-head' }, [tabs]),
    drawing,
    el('p', { class: 'sgv__hint' }, [
      'These drawings are to help you decide, not to build from. Your engineer and the municipality set the real setbacks, structure and approvals. ',
      el('span', { class: 'ne', lang: 'ne', text: 'यी नक्सा निर्णय गर्न सजिलो होस् भनेर हो — निर्माणका लागि होइन।' }),
    ]),
    el('div', { class: 'sgv__submit' }, [seeIt, again]),
    visualsMount,
  ]);
}

/** Renders the generated pictures under the plan. */
export function renderVisuals(mount: HTMLElement, data: VisualsResponse): void {
  const entries = Object.entries(data.visuals);
  mount.replaceChildren(
    el('h3', { class: 'sgv__visuals-head' }, [
      'How it could look',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'यस्तो देखिन सक्छ' }),
    ]),
    el(
      'div',
      { class: 'sgv__gallery' },
      entries.flatMap(([key, value]) =>
        value.images.map((image) =>
          el('figure', { class: 'sgv__shot' }, [
            el('img', {
              src: image.url,
              alt: `${ROOM_LABELS[key] ?? key}, ${image.variant}`,
              loading: 'lazy',
              decoding: 'async',
            }),
            el('figcaption', {
              text: `${ROOM_LABELS[key] ?? key}${image.variant === 'night' ? ' · evening' : ''}`,
            }),
          ]),
        ),
      ),
    ),
    el('p', { class: 'sgv__hint' }, [
      'Visualization only — not a construction specification. ',
      el('span', { class: 'ne', lang: 'ne', text: 'यो केवल कल्पना हो — निर्माण नक्सा होइन।' }),
    ]),
  );
}

function stat(label: string, value: string, note: string): HTMLElement {
  return el('div', { class: 'sgv__stat' }, [
    el('span', { class: 'sgv__stat-label', text: label }),
    el('span', { class: 'sgv__stat-value', text: value }),
    note ? el('span', { class: 'sgv__stat-note', text: note }) : null,
  ]);
}

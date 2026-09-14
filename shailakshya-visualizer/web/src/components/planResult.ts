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
import type { PlannedRoom, PlanResponse, VisualsResponse } from '../lib/api.ts';

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
      showFloor(index);
    });
    tabs.append(button);
    return button;
  });

  // The drawing scales to the width it is given, which on a phone makes the
  // labels inside it too small to read. This list carries the same numbers in
  // real text — legible at any width, selectable, and the only version a
  // screen reader can use at all. Before it existed a phone visitor saw the
  // left half of their house and no way to know the rest was there.
  const schedule = el('div', { class: 'sgv__schedule' });
  const showFloor = (index: number) => {
    const floor = floors[index];
    if (!floor) return;
    drawing.innerHTML = floor.svg;
    schedule.replaceChildren(roomSchedule(plan.floors[index]?.rooms ?? []));
  };

  showFloor(0);

  const warnings = plan.warnings.length
    ? el('div', { class: `sgv__msg ${plan.fits ? 'sgv__msg--warn' : 'sgv__msg--error'}` }, [
        el('strong', {
          text: plan.fits
            ? 'Worth knowing before you decide'
            : 'This brief does not comfortably fit this land',
        }),
        el('ul', { class: 'sgv__warnlist' }, plan.warnings.map((w) => el('li', { text: w }))),
      ])
    : el('div', { class: 'sgv__msg sgv__msg--good' }, [
        el('strong', { text: 'Everything fits comfortably on this plot.' }),
        el('span', {
          class: 'sgv__msg-ne',
          lang: 'ne',
          text: 'सबै कुरा यो जग्गामा राम्ररी अट्छ।',
        }),
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
    schedule,
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
  // The exterior is the picture people show their family, and it is the one we
  // pay for twice over (day and dusk). It was landing fourth in a grid of
  // equals, the same size as the bathroom. It gets its own row now, above the
  // rooms — a separate grid rather than a column span, because a span leaves a
  // ragged hole in the row whenever the next item will not fit beside it.
  const entries = Object.entries(data.visuals);
  const outside = entries.filter(([key]) => key === 'exterior');
  const inside = entries.filter(([key]) => key !== 'exterior');

  const shot = (key: string, image: { url: string; variant: string }) =>
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
    ]);

  // replaceChildren takes no nulls, so the optional blocks are filtered out
  // rather than passed through the way el()'s children are.
  const blocks: Array<HTMLElement | null> = [
    el('h3', { class: 'sgv__visuals-head' }, [
      'How it could look',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'यस्तो देखिन सक्छ' }),
    ]),
    outside.length
      ? el(
          'div',
          { class: 'sgv__gallery sgv__gallery--outside' },
          outside.flatMap(([key, value]) => value.images.map((image) => shot(key, image))),
        )
      : null,
    inside.length
      ? el('h4', { class: 'sgv__visuals-sub' }, [
          'Inside',
          el('span', { class: 'sgv__ne', lang: 'ne', text: 'भित्र' }),
        ])
      : null,
    el(
      'div',
      { class: 'sgv__gallery' },
      inside.flatMap(([key, value]) => value.images.map((image) => shot(key, image))),
    ),
    el('p', { class: 'sgv__hint' }, [
      'Visualization only — not a construction specification. ',
      el('span', { class: 'ne', lang: 'ne', text: 'यो केवल कल्पना हो — निर्माण नक्सा होइन।' }),
    ]),
  ];

  mount.replaceChildren(...blocks.filter((block): block is HTMLElement => block !== null));
}

/**
 * Every room on the floor, with its size. Rooms the engine flagged as tight
 * are marked — that is the number a customer most needs to argue with, and
 * burying it inside a drawing they cannot read on a phone helped nobody.
 */
function roomSchedule(rooms: PlannedRoom[]): HTMLElement {
  return el('ul', { class: 'sgv__rooms' }, rooms.map((room) =>
    el('li', { class: `sgv__room${room.tight ? ' sgv__room--tight' : ''}` }, [
      el('span', { class: 'sgv__room-name' }, [
        room.nameEn,
        el('span', { class: 'sgv__room-ne', lang: 'ne', text: room.nameNe }),
      ]),
      el('span', { class: 'sgv__room-size' }, [
        room.w && room.h ? `${room.w.toFixed(1)}′ × ${room.h.toFixed(1)}′` : '',
        el('span', { class: 'sgv__room-area', text: `${room.areaSqFt} sq ft` }),
      ]),
      room.tight ? el('span', { class: 'sgv__room-flag', text: 'tight' }) : null,
    ]),
  ));
}

function stat(label: string, value: string, note: string): HTMLElement {
  return el('div', { class: 'sgv__stat' }, [
    el('span', { class: 'sgv__stat-label', text: label }),
    el('span', { class: 'sgv__stat-value', text: value }),
    note ? el('span', { class: 'sgv__stat-note', text: note }) : null,
  ]);
}

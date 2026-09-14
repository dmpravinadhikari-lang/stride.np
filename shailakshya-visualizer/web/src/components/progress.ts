/**
 * Phase-by-phase progress.
 *
 * SPEC §9 asks for something real during the wait rather than a spinner. This
 * shows the actual phases of the job: which are finished, which is running, and
 * roughly how far through.
 *
 * It is honest about which is which. Phases the client genuinely observes —
 * reading the description, computing the layout, drawing the floors — tick over
 * when they really complete. The image generation is one request that returns
 * once, so its inner progress is an estimate paced to how long a set usually
 * takes, and it never claims to have finished a phase the server has not
 * confirmed. The bar approaches but never reaches the end until the response
 * lands.
 */
import { el } from '../lib/dom.ts';

export interface Phase {
  en: string;
  ne: string;
  /** Rough share of the total wait, used to pace the bar. */
  weight: number;
}

export interface ProgressHandle {
  node: HTMLElement;
  /** Marks every phase up to `index` complete and starts the one at `index`. */
  advance: (index: number) => void;
  /** Marks everything complete. */
  stop: () => void;
}

export function phaseProgress(phases: Phase[], titleEn: string, titleNe: string): ProgressHandle {
  const total = phases.reduce((sum, phase) => sum + phase.weight, 0) || 1;

  const items = phases.map((phase) =>
    el('li', { class: 'sgv__phase' }, [
      el('span', { class: 'sgv__phase-mark', 'aria-hidden': 'true' }),
      el('span', { class: 'sgv__phase-text' }, [
        phase.en,
        el('span', { class: 'sgv__phase-ne', lang: 'ne', text: phase.ne }),
      ]),
    ]),
  );

  const fill = el('div', { class: 'sgv__bar-fill' });
  const pct = el('span', { class: 'sgv__bar-pct', text: '0%' });
  const elapsed = el('span', { class: 'sgv__bar-time', text: '0s' });

  const node = el('div', {
    class: 'sgv__progress',
    role: 'status',
    'aria-live': 'polite',
  }, [
    el('div', { class: 'sgv__progress-head' }, [
      el('h3', {}, [titleEn, el('span', { class: 'sgv__ne', lang: 'ne', text: titleNe })]),
      el('span', { class: 'sgv__progress-meta' }, [pct, elapsed]),
    ]),
    el('div', { class: 'sgv__bar' }, [fill]),
    el('ul', { class: 'sgv__phases' }, items),
  ]);

  const started = Date.now();
  let current = 0;
  let phaseStarted = Date.now();
  let finished = false;

  /** Fraction of the total already banked by completed phases. */
  const completedShare = () =>
    phases.slice(0, current).reduce((sum, phase) => sum + phase.weight, 0) / total;

  const paint = () => {
    if (finished) return;

    const phase = phases[current];
    const share = phase ? phase.weight / total : 0;

    // Inside the running phase the bar eases towards its share but never fills
    // it, so it cannot claim a phase finished before it has.
    const within = phase
      ? Math.min((Date.now() - phaseStarted) / (phase.weight * 1000), 0.92)
      : 0;

    const value = Math.min((completedShare() + share * within) * 100, 97);
    fill.style.width = `${value}%`;
    pct.textContent = `${Math.round(value)}%`;
    elapsed.textContent = `${Math.floor((Date.now() - started) / 1000)}s`;
  };

  const timer = window.setInterval(paint, 250);

  const render = () => {
    items.forEach((item, index) => {
      item.classList.toggle('sgv__phase--done', index < current);
      item.classList.toggle('sgv__phase--now', index === current);
    });
  };

  render();
  paint();

  return {
    node,
    advance: (index: number) => {
      if (finished || index <= current) return;
      current = Math.min(index, phases.length - 1);
      phaseStarted = Date.now();
      render();
      paint();
    },
    stop: () => {
      finished = true;
      window.clearInterval(timer);
      current = phases.length;
      render();
      fill.style.width = '100%';
      pct.textContent = '100%';
    },
  };
}

/** The phases of a full run, from typed description to finished pictures. */
export const FULL_RUN: Phase[] = [
  { en: 'Reading what you wrote', ne: 'तपाईंले लेखेको पढ्दै', weight: 4 },
  { en: 'Working out a layout that fits', ne: 'मिल्ने नक्सा निकाल्दै', weight: 2 },
  { en: 'Drawing the floor plans', ne: 'नक्सा कोर्दै', weight: 2 },
  { en: 'Drawing the house from the road', ne: 'बाहिरबाट घर कोर्दै', weight: 16 },
  { en: 'Drawing each room inside', ne: 'भित्रका कोठा कोर्दै', weight: 24 },
];

/** Just the picture phases, when the plan is already on screen. */
export const VISUALS_ONLY: Phase[] = [
  { en: 'Reading the room sizes off your plan', ne: 'कोठाको नाप पढ्दै', weight: 2 },
  { en: 'Drawing the house in daylight', ne: 'दिउँसोको घर कोर्दै', weight: 12 },
  { en: 'Drawing it again at dusk', ne: 'साँझको घर कोर्दै', weight: 10 },
  { en: 'Drawing each room inside', ne: 'भित्रका कोठा कोर्दै', weight: 24 },
];

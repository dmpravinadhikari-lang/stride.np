/**
 * Standalone demo build.
 *
 * The floor plan engine is pure geometry with no server dependency, so the
 * whole planning half of the product runs in the browser. This entry point
 * wires the real components to a local computation instead of the Worker, so
 * the tool can be shown and shared without deploying anything and without any
 * API key existing in a public page.
 *
 * What it deliberately cannot do: run the language model over a typed
 * description, and generate the exterior and interior views. Both need a key,
 * and a key in a public page is a key that has been given away. Those steps say
 * so rather than failing — but a typed sentence is still read locally and
 * prefilled, because silently discarding what somebody just wrote is the worst
 * possible answer to "we cannot do the clever version of this".
 */
import css from './styles.css?inline';
import { el, clear } from './lib/dom.ts';
import type { Brief, PlanResponse, StylePack } from './lib/api.ts';
import { briefForm } from './components/briefForm.ts';
import { home } from './components/home.ts';
import { planResult } from './components/planResult.ts';
import { readBrief, briefFrom } from './lib/readBrief.ts';
import { planHouse } from '../../worker/plan/layout.ts';
import { renderFloorSvg } from '../../worker/plan/render.ts';
import { publicPacks } from '../../worker/styles/packs.ts';

const PACKS = publicPacks() as StylePack[];

function injectStyles(): void {
  if (document.getElementById('sgv-styles')) return;
  const style = document.createElement('style');
  style.id = 'sgv-styles';
  style.textContent = css;
  document.head.append(style);
}

function computeLocally(brief: Brief): PlanResponse {
  const plan = planHouse(brief.land as never, brief.requirements as never);
  return {
    plan: plan as never,
    floors: plan.floors.map((floor) => ({
      level: floor.level,
      nameEn: floor.nameEn,
      nameNe: floor.nameNe,
      svg: renderFloorSvg(plan, floor, { width: 900 }),
    })),
    briefId: 'demo',
  };
}

function notice(): HTMLElement {
  return el('div', { class: 'sgv__msg sgv__msg--warn' }, [
    el('strong', { text: 'Working demo — the floor plan half' }),
    el('p', { class: 'sgv__hint' }, [
      'Everything here is computed live in your browser: change the land or the rooms and the plans redraw. ',
      'Describing the job in words, and generating the exterior and interior views, both need the deployed backend and its API keys — those are not in this page.',
    ]),
  ]);
}

function start(root: HTMLElement): void {
  root.classList.add('sgv');

  const showHome = () => {
    clear(root);
    root.append(
      home({
        packs: PACKS,
        onStart: ({ prompt, stylePackId }) => {
          if (prompt) {
            const read = readBrief(prompt);
            showForm(briefFrom(read, stylePackId), prompt, read.found);
            return;
          }
          showForm(
            stylePackId
              ? briefFrom({ land: {}, requirements: {}, found: [] }, stylePackId)
              : undefined,
          );
        },
      }),
    );
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    const button = el('button', { class: 'sgv__back', type: 'button' }, [
      el('span', { 'aria-hidden': 'true', text: '←' }),
      'Start again',
      el('span', { class: 'ne', lang: 'ne', text: 'सुरुबाट' }),
    ]);
    button.addEventListener('click', showHome);
    return el('div', { class: 'sgv__backbar' }, [button]);
  };

  const showForm = (initial?: Brief, said?: string, found: string[] = []) => {
    clear(root);
    root.append(
      el('div', { class: 'sgv__shell sgv__section' }, [
        back(),
        el('h2', {}, [
          said ? 'Check the details' : 'Tell us about your land',
          el('span', {
            class: 'sgv__ne',
            lang: 'ne',
            text: said ? 'विवरण जाँच्नुहोस्' : 'आफ्नो जग्गाको बारेमा भन्नुहोस्',
          }),
        ]),
        el('p', { class: 'sgv__lead' }, [
          'We lay out a house that fits it, and draw the floor plans.',
        ]),
        said
          ? el('blockquote', { class: 'sgv__said' }, [
              el('span', { class: 'sgv__said-label' }, [
                'You asked for',
                el('span', { class: 'ne', lang: 'ne', text: 'तपाईंले भन्नुभयो' }),
              ]),
              el('p', { text: said }),
            ])
          : null,
        found.length
          ? el('div', { class: 'sgv__msg sgv__msg--info' }, [
              el('div', {
                text: `We filled in the ${found.join(', ')} from your description. Check it below and change anything we got wrong.`,
              }),
            ])
          : null,
        briefForm({
          packs: PACKS,
          initial,
          banner: notice(),
          onSubmit: (brief) => {
            clear(root);
            root.append(
              back(),
              planResult({
                result: computeLocally(brief),
                onRestart: () => showForm(brief),
                onVisuals: (mount) => {
                  mount.replaceChildren(
                    el('div', { class: 'sgv__msg sgv__msg--warn' }, [
                      el('strong', { text: 'Not available in this demo' }),
                      el('p', { class: 'sgv__hint' }, [
                        'The exterior and interior views are generated by an image model, which needs the deployed Worker and its API key. The floor plans above are the real output.',
                      ]),
                    ]),
                  );
                },
              }),
            );
            window.scrollTo({ top: 0, behavior: 'smooth' });
          },
        }),
      ]),
    );
  };

  showHome();
}

function boot(): void {
  injectStyles();
  for (const mount of document.querySelectorAll<HTMLElement>('[data-shailakshya-visualizer]')) {
    start(mount);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

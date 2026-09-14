/**
 * Widget entry point.
 *
 * The flow is: tell us about your land and what you need → see your floor plans
 * (free, instant) → optionally see what it looks like (generated).
 *
 * Mounts into any <div data-shailakshya-visualizer> on the host page, so
 * embedding into the company's existing site is one div and one script tag.
 */
import css from './styles.css?inline';
import { announce, clear, el } from './lib/dom.ts';
import { Api, ApiError, type Brief, type PlanResponse, type StylePack } from './lib/api.ts';
import { home } from './components/home.ts';
import { briefForm } from './components/briefForm.ts';
import { describeStep, understoodBanner } from './components/describeStep.ts';
import { planResult, renderVisuals } from './components/planResult.ts';
import { progress } from './components/progress.ts';

function injectStyles(): void {
  if (document.getElementById('sgv-styles')) return;
  const style = document.createElement('style');
  style.id = 'sgv-styles';
  style.textContent = css;
  document.head.append(style);
}

class Visualizer {
  private readonly api: Api;
  private readonly live: HTMLElement;
  private packs: StylePack[] = [];
  /** Set when the visitor entered through a style card on the home page. */
  private chosenStyle: string | undefined;

  constructor(private readonly root: HTMLElement) {
    this.api = new Api(root.dataset.api ?? '');
    this.root.classList.add('sgv');
    this.live = el('div', {
      class: 'sgv__visually-hidden',
      role: 'status',
      'aria-live': 'polite',
    });
    this.root.append(this.live);
  }

  async start(): Promise<void> {
    try {
      this.packs = await this.api.styles();
    } catch {
      // Surfaced if and when the visitor reaches the style step.
    }
    // Rendered after the packs land so the home page opens with its style
    // cards already in place rather than filling them in a beat later.
    this.renderHome();
  }

  private mount(...nodes: HTMLElement[]): void {
    clear(this.root);
    this.root.append(this.live, ...nodes);
  }

  private renderHome(): void {
    this.mount(
      home({
        packs: this.packs,
        onStart: (stylePackId) => this.renderDescribe(stylePackId),
      }),
    );
    window.scrollTo({ top: 0 });
  }

  /**
   * The open door: say it however you like, or go straight to the form.
   * A style chosen on the home page is carried through both routes.
   */
  private renderDescribe(stylePackId?: string): void {
    this.chosenStyle = stylePackId;
    this.mount(
      describeStep({
        onDescribe: (text, files) => void this.parseAndReview(text, files),
        onUseForm: () => this.renderBrief(this.withStyle()),
      }),
    );
    this.focusHeading();
    window.scrollTo({ top: 0 });
  }

  /** A prefill carrying only the style the visitor picked on the home page. */
  private withStyle(): Brief | undefined {
    if (!this.chosenStyle) return undefined;
    return {
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
        stylePackId: this.chosenStyle,
      },
    };
  }

  private async parseAndReview(text: string, files: File[]): Promise<void> {
    this.mount(
      el('div', { class: 'sgv__shell sgv__section' }, [
        el('div', { class: 'sgv__msg sgv__msg--warn', role: 'status' }, [
          el('strong', { text: 'Reading what you wrote…' }),
        ]),
      ]),
    );
    announce(this.live, 'Reading your description.');

    try {
      const parsed = await this.api.parseBrief(text, files);
      this.renderBrief(
        {
          land: parsed.land,
          requirements: {
            ...parsed.requirements,
            // A style tapped on the home page is an explicit choice; the parse
            // only guesses at one, so it does not get to overrule it.
            stylePackId: this.chosenStyle ?? parsed.requirements.stylePackId,
          },
        },
        understoodBanner(parsed.understood, parsed.missing),
      );
      announce(this.live, 'Check what we understood, then design.');
    } catch (err) {
      // Never a dead end: the form always works, so fall through to it.
      const apiError = err instanceof ApiError ? err : null;
      this.renderBrief(
        this.withStyle(),
        message(
          apiError?.messageEn ??
            'We could not read that automatically. Please fill in the details below instead.',
          apiError?.messageNe ?? 'स्वतः पढ्न सकिएन। तलको विवरण भर्नुहोस्।',
          'warn',
        ),
      );
    }
  }

  private renderBrief(initial?: Brief, banner?: HTMLElement): void {
    const form = briefForm({
      packs: this.packs,
      initial,
      banner,
      onSubmit: (brief) => void this.computePlan(brief),
    });

    this.mount(el('div', { class: 'sgv__shell sgv__section' }, [
      el('h2', {}, [
        initial ? 'Check the details' : 'Tell us about your land',
        el('span', {
          class: 'sgv__ne',
          lang: 'ne',
          text: initial ? 'विवरण जाँच्नुहोस्' : 'आफ्नो जग्गाको बारेमा भन्नुहोस्',
        }),
      ]),
      el('p', { class: 'sgv__lead' }, [
        initial
          ? 'Change anything that is not right, then we will lay out your house.'
          : 'We will lay out a house that fits it, and show you what it could look like.',
      ]),
      form,
    ]));

    this.focusHeading();
  }

  private focusHeading(): void {
    const heading = this.root.querySelector('h2');
    heading?.setAttribute('tabindex', '-1');
    (heading as HTMLElement | null)?.focus();
  }

  /** Free and fast — no model runs, so there is no loading theatre here. */
  private async computePlan(brief: Brief): Promise<void> {
    announce(this.live, 'Working out your floor plan.');

    let result: PlanResponse;
    try {
      result = await this.api.plan(brief);
    } catch (err) {
      this.renderFailure(err, () => this.renderBrief(this.withStyle()));
      return;
    }

    announce(
      this.live,
      result.plan.fits
        ? 'Your floor plan is ready.'
        : 'Your floor plan is ready, with some notes about the fit.',
    );

    this.mount(
      planResult({
        result,
        onRestart: () => this.renderHome(),
        onVisuals: (mount) => void this.generateVisuals(brief, mount),
      }),
    );
  }

  /** The metered half. This one does take twenty seconds, so it says so. */
  private async generateVisuals(brief: Brief, mount: HTMLElement): Promise<void> {
    const pack = this.packs.find((p) => p.id === brief.requirements.stylePackId);
    const wait = progress(pack ?? { nameEn: 'your chosen', nameNe: '' } as StylePack);
    mount.replaceChildren(wait.node);
    mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    announce(this.live, 'Drawing your house. This usually takes under a minute.');

    try {
      const visuals = await this.api.planVisuals(brief);
      wait.stop();
      renderVisuals(mount, visuals);
      announce(this.live, 'Your pictures are ready.');
    } catch (err) {
      wait.stop();
      const apiError = err instanceof ApiError ? err : null;
      mount.replaceChildren(
        message(
          apiError?.messageEn ?? 'The pictures could not be generated just now.',
          apiError?.messageNe ?? 'अहिले तस्बिर बनाउन सकिएन।',
          apiError?.reason === 'capacity' || apiError?.reason === 'rate_limited' ? 'warn' : 'error',
        ),
      );
      announce(this.live, apiError?.messageEn ?? 'Pictures failed.');
    }
  }

  private renderFailure(err: unknown, back: () => void): void {
    const apiError = err instanceof ApiError ? err : null;

    const button = el('button', { class: 'sgv__btn', type: 'button', text: 'Back' });
    button.addEventListener('click', back);

    this.mount(
      el('section', { class: 'sgv__section sgv__shell' }, [
        message(
          apiError?.messageEn ?? 'Something went wrong. Please try again.',
          apiError?.messageNe ?? 'केही गडबड भयो। फेरि प्रयास गर्नुहोस्।',
          'error',
        ),
        el('div', { style: 'margin-top:1.25rem' }, [button]),
      ]),
    );
  }
}

function message(en: string, ne: string, kind: 'warn' | 'error'): HTMLElement {
  return el('div', { class: `sgv__msg sgv__msg--${kind}`, role: 'alert' }, [
    el('div', { text: en }),
    el('div', { class: 'sgv__msg-ne', lang: 'ne', text: ne }),
  ]);
}

function boot(): void {
  injectStyles();
  const mounts = document.querySelectorAll<HTMLElement>('[data-shailakshya-visualizer]');
  for (const mount of mounts) void new Visualizer(mount).start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

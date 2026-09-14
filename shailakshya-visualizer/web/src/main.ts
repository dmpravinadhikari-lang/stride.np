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
import {
  Api,
  ApiError,
  type AuthState,
  type Brief,
  type PlanResponse,
  type StylePack,
} from './lib/api.ts';
import { home } from './components/home.ts';
import { briefForm } from './components/briefForm.ts';
import { describeStep, understoodBanner } from './components/describeStep.ts';
import { planResult, renderVisuals } from './components/planResult.ts';
import { phaseProgress, FULL_RUN, VISUALS_ONLY } from './components/progress.ts';
import { authGate } from './components/authGate.ts';

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
  private auth: AuthState = { configured: false, required: false, signedIn: false, clientId: null };

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
    // Both are needed before the first screen: the packs fill the style cards,
    // and the auth state decides whether a gate exists at all.
    const [packs, auth] = await Promise.allSettled([this.api.styles(), this.api.authState()]);
    if (packs.status === 'fulfilled') this.packs = packs.value;
    if (auth.status === 'fulfilled') this.auth = auth.value;
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
        onStart: ({ prompt, stylePackId }) => {
          this.chosenStyle = stylePackId;
          // A typed prompt goes straight to parsing; there is no reason to show
          // someone an empty description box they have already filled in.
          if (prompt) void this.gateThen(prompt, () => this.parseAndReview(prompt, []));
          else this.renderDescribe(stylePackId);
        },
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
        onDescribe: (text, files) =>
          void this.gateThen(text, () => this.parseAndReview(text, files)),
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

  /**
   * Runs `next` once the visitor is past the sign-in gate. When the company has
   * not configured sign-in, or has turned the requirement off, this is a
   * straight pass-through — the gate is never the reason a deploy is broken.
   */
  private async gateThen(prompt: string, next: () => Promise<void> | void): Promise<void> {
    if (!this.auth.required || this.auth.signedIn || !this.auth.clientId) {
      await next();
      return;
    }

    this.mount(
      authGate({
        clientId: this.auth.clientId,
        prompt,
        onCancel: () => this.renderHome(),
        onCredential: (credential) => {
          void (async () => {
            try {
              await this.api.signIn(credential, prompt);
              this.auth = { ...this.auth, signedIn: true };
              await next();
            } catch (err) {
              this.renderFailure(err, () => this.renderHome());
            }
          })();
        },
      }),
    );
    this.focusHeading();
    window.scrollTo({ top: 0 });
    announce(this.live, 'Please sign in with Google to see your design.');
  }

  private async parseAndReview(text: string, files: File[]): Promise<void> {
    // One progress panel spans parsing, layout and drawing, so the wait reads
    // as one job rather than three unexplained pauses.
    const run = phaseProgress(
      FULL_RUN.slice(0, 3),
      'Working on your plan',
      'नक्सा बन्दै',
    );
    this.mount(el('div', { class: 'sgv__shell sgv__section' }, [run.node]));
    announce(this.live, 'Reading your description.');

    try {
      const parsed = await this.api.parseBrief(text, files);
      run.advance(1);
      run.stop();
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
      run.stop();
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
    const wait = phaseProgress(VISUALS_ONLY, 'Drawing your house', 'तपाईंको घर कोर्दै');
    mount.replaceChildren(wait.node);

    // Paced to the phase weights. The set returns in one response, so these are
    // an estimate — they never mark a phase done that the server has confirmed.
    const marks = [1, 2, 3].map((phase, i) =>
      window.setTimeout(() => wait.advance(phase), (i + 1) * 9000),
    );
    const clearMarks = () => marks.forEach((m) => window.clearTimeout(m));
    mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    announce(this.live, 'Drawing your house. This usually takes under a minute.');

    try {
      const visuals = await this.api.planVisuals(brief);
      clearMarks();
      wait.stop();
      renderVisuals(mount, visuals);
      announce(this.live, 'Your pictures are ready.');
    } catch (err) {
      clearMarks();
      wait.stop();
      const apiError = err instanceof ApiError ? err : null;

      // A refusal for sign-in is not a failure; it is the gate, so show it.
      if (apiError?.reason === 'sign_in_required' && this.auth.clientId) {
        void this.gateThen('', () => this.generateVisuals(brief, mount));
        return;
      }

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

/**
 * Widget entry point.
 *
 * Mounts into any <div data-shailakshya-visualizer> on the host page, so
 * embedding into the company's existing site is one div and one script tag.
 * Styles are injected from the bundle rather than shipped as a second file the
 * client would have to remember to link.
 */
import css from './styles.css?inline';
import { announce, clear, el } from './lib/dom.ts';
import { Api, ApiError, type GenerationResult, type StylePack } from './lib/api.ts';
import { hero } from './components/hero.ts';
import { uploader } from './components/uploader.ts';
import { styleGrid } from './components/styleGrid.ts';
import { progress } from './components/progress.ts';
import { resultView } from './components/result.ts';

const HERO_BEFORE = 'reference/hero-before.svg';
const HERO_AFTER = 'reference/hero-after.svg';

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
  private photo: File | null = null;
  private pack: StylePack | null = null;

  constructor(private readonly root: HTMLElement) {
    // Defaults to same-origin, which is what the Worker serves in production.
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
    this.renderHero();

    // Loaded up front so the style step never stalls on a network round trip
    // the visitor has to wait through.
    try {
      this.packs = await this.api.styles();
    } catch {
      // Non-fatal here: the error surfaces if they reach the style step.
    }
  }

  private mount(...nodes: HTMLElement[]): void {
    clear(this.root);
    this.root.append(this.live, ...nodes);
  }

  private renderHero(): void {
    this.mount(
      hero({
        beforeSrc: HERO_BEFORE,
        afterSrc: HERO_AFTER,
        onStart: () => this.renderChooser(),
      }),
    );
  }

  private renderChooser(): void {
    const notice = el('div');

    const submit = el('button', {
      class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
      type: 'button',
      disabled: true,
      text: 'Show me the design',
    });

    const refresh = () => {
      submit.disabled = !(this.photo && this.pack);
    };

    const photoStep = el('section', { class: 'sgv__section sgv__shell' }, [
      el('div', { class: 'sgv__step-head' }, [
        el('h2', {}, [
          'Your photo',
          el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंको फोटो' }),
        ]),
      ]),
      uploader({
        onPick: (file) => {
          this.photo = file;
          refresh();
        },
      }),
    ]);

    const styleStep = el('section', { class: 'sgv__section sgv__shell' }, [
      el('div', { class: 'sgv__step-head' }, [
        el('h2', {}, [
          'Pick a style',
          el('span', { class: 'sgv__ne', lang: 'ne', text: 'शैली छान्नुहोस्' }),
        ]),
      ]),
      this.packs.length > 0
        ? styleGrid({
            packs: this.packs,
            onSelect: (pack) => {
              this.pack = pack;
              refresh();
            },
          })
        : message(
            'Styles could not be loaded. Please refresh the page.',
            'शैलीहरू लोड भएनन्। पृष्ठ रिफ्रेस गर्नुहोस्।',
            'error',
          ),
      el('div', { style: 'margin-top:1.75rem' }, [submit]),
      notice,
    ]);

    submit.addEventListener('click', () => void this.generate(notice));

    this.mount(photoStep, el('hr', { class: 'sgv__rule sgv__shell' }), styleStep);

    // Send focus to the new heading so keyboard and screen-reader users land
    // where the content changed rather than back at the top of the document.
    photoStep.querySelector('h2')?.setAttribute('tabindex', '-1');
    (photoStep.querySelector('h2') as HTMLElement | null)?.focus();

    void this.checkCapacity(notice);
  }

  /** Warns before the visitor invests time in an upload, not after. */
  private async checkCapacity(slot: HTMLElement): Promise<void> {
    try {
      const status = await this.api.status();
      if (status.accepting) return;

      slot.replaceChildren(
        message(
          "Custom designs are at capacity today. You can still browse saved designs, or leave your number and we'll send yours tomorrow.",
          'आजको क्षमता सकियो। सुरक्षित डिजाइन हेर्नुहोस्, वा नम्बर छोड्नुहोस् — भोलि पठाउँछौं।',
          'warn',
        ),
      );
    } catch {
      // A status probe failing is not worth showing anyone.
    }
  }

  private async generate(slot: HTMLElement): Promise<void> {
    const photo = this.photo;
    const pack = this.pack;
    if (!photo || !pack) return;

    slot.replaceChildren();

    const wait = progress(pack);
    this.mount(el('section', { class: 'sgv__section sgv__shell' }, [wait.node]));
    announce(this.live, 'Generating your design. This usually takes under twenty seconds.');

    let result: GenerationResult;
    try {
      result = await this.api.restyle(photo, pack.id);
    } catch (err) {
      wait.stop();
      this.renderFailure(err);
      return;
    }

    wait.stop();
    announce(this.live, 'Your design is ready.');

    this.mount(
      resultView({
        result,
        pack,
        onRestart: () => this.renderChooser(),
      }),
    );
  }

  private renderFailure(err: unknown): void {
    const apiError = err instanceof ApiError ? err : null;

    const back = el('button', {
      class: 'sgv__btn',
      type: 'button',
      text: 'Back',
    });
    back.addEventListener('click', () => this.renderChooser());

    this.mount(
      el('section', { class: 'sgv__section sgv__shell' }, [
        message(
          apiError?.messageEn ?? 'Something went wrong. Please try again.',
          apiError?.messageNe ?? 'केही गडबड भयो। फेरि प्रयास गर्नुहोस्।',
          apiError?.reason === 'capacity' || apiError?.reason === 'rate_limited'
            ? 'warn'
            : 'error',
        ),
        el('div', { style: 'margin-top:1.25rem' }, [back]),
      ]),
    );

    announce(this.live, apiError?.messageEn ?? 'Generation failed.');
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

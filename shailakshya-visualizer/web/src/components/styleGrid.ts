/**
 * Style selection — SPEC §9: large tactile image cards, never a dropdown.
 *
 * Rendered as a radio group in behaviour but built from buttons with
 * aria-pressed, so the cards can be full-bleed images without fighting native
 * radio rendering. Arrow keys move between them the way a real radio group
 * does.
 */
import { el } from '../lib/dom.ts';
import type { StylePack } from '../lib/api.ts';

export interface StyleGridOptions {
  packs: StylePack[];
  onSelect: (pack: StylePack) => void;
}

export function styleGrid({ packs, onSelect }: StyleGridOptions): HTMLElement {
  const buttons: HTMLButtonElement[] = [];

  const grid = el('div', {
    class: 'sgv__styles',
    role: 'group',
    'aria-label': 'Choose a style',
  });

  packs.forEach((pack, index) => {
    const swatch = el('div', { class: 'sgv__style-swatch', '--swatch': pack.swatch });

    // A reference photo replaces the flat swatch as soon as one exists; until
    // then the material colour stands in rather than a broken image icon.
    const reference = el('img', {
      src: `reference/${pack.id}.webp`,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
    });
    reference.addEventListener('error', () => reference.remove(), { once: true });
    swatch.append(reference);

    const button = el('button', {
      class: 'sgv__style',
      type: 'button',
      'aria-pressed': 'false',
      'data-id': pack.id,
    }, [
      swatch,
      el('div', { class: 'sgv__style-body' }, [
        el('div', { class: 'sgv__style-name' }, [
          pack.nameEn,
          el('span', { class: 'sgv__style-ne', lang: 'ne', text: ` ${pack.nameNe}` }),
        ]),
        el('div', { class: 'sgv__style-desc', text: pack.descriptionEn }),
        el('div', { class: 'sgv__style-desc ne', lang: 'ne', text: pack.descriptionNe }),
      ]),
    ]);

    button.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      onSelect(pack);
    });

    button.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      buttons[(index + step + buttons.length) % buttons.length]?.focus();
    });

    buttons.push(button);
    grid.append(button);
  });

  return grid;
}

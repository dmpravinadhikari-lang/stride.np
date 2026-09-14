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
  /** Pre-pressed card, when the brief already named a style. */
  selectedId?: string;
  onSelect: (pack: StylePack) => void;
}

export function styleGrid({ packs, selectedId, onSelect }: StyleGridOptions): HTMLElement {
  const buttons: HTMLButtonElement[] = [];

  const grid = el('div', {
    class: 'sgv__styles',
    role: 'group',
    'aria-label': 'Choose a style',
  });

  packs.forEach((pack, index) => {
    const swatch = el('div', { class: 'sgv__style-swatch', '--swatch': pack.swatch });

    // Tried in order: a real photograph if the company has supplied one, then
    // the drawn illustration, then nothing — in which case the flat material
    // colour behind shows through rather than a broken image icon. Dropping a
    // photo into web/public/reference/ is therefore the whole swap; no code
    // change and no rebuild of this file.
    const sources = [`reference/${pack.id}.webp`, `reference/${pack.id}.svg`];
    const reference = el('img', { alt: '', loading: 'lazy', decoding: 'async' });

    let attempt = 0;
    const tryNext = () => {
      const next = sources[attempt++];
      if (next) reference.src = next;
      else reference.remove();
    };
    reference.addEventListener('error', tryNext);
    tryNext();

    swatch.append(reference);

    const button = el('button', {
      class: 'sgv__style',
      type: 'button',
      'aria-pressed': String(pack.id === selectedId),
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

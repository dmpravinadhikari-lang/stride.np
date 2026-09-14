/**
 * Photo step.
 *
 * Accepts a drop, a file pick, or a phone camera — `capture` matters here,
 * since most visitors are on a phone standing in front of the house.
 */
import { el } from '../lib/dom.ts';

const MAX_BYTES = 10 * 1024 * 1024;

export interface UploaderOptions {
  onPick: (file: File | null) => void;
}

export function uploader({ onPick }: UploaderOptions): HTMLElement {
  const input = el('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp',
    class: 'sgv__visually-hidden',
    id: 'sgv-photo',
  });

  const drop = el('label', { class: 'sgv__drop', for: 'sgv-photo' }, [
    el('span', { class: 'sgv__drop-title', text: 'Choose a photo of the house' }),
    el('span', { class: 'sgv__ne', lang: 'ne', text: 'घरको फोटो छान्नुहोस्' }),
    el('span', {
      class: 'sgv__drop-hint',
      text: 'JPEG, PNG or WebP · up to 10 MB · a straight-on view works best',
    }),
  ]);

  const slot = el('div', { style: 'margin-top:1rem' });
  const wrap = el('div', {}, [drop, input, slot]);

  const show = (file: File) => {
    const preview = el('img', {
      src: URL.createObjectURL(file),
      alt: 'The photo you chose',
    });
    // Revoke once decoded, or every pick leaks a blob URL for the session.
    preview.addEventListener('load', () => URL.revokeObjectURL(preview.src), {
      once: true,
    });

    const change = el('button', {
      class: 'sgv__btn sgv__btn--quiet',
      type: 'button',
      text: 'Choose a different photo',
    });
    change.addEventListener('click', () => input.click());

    slot.replaceChildren(
      el('div', { class: 'sgv__preview' }, [
        preview,
        el('div', { class: 'sgv__preview-meta' }, [
          el('div', { class: 'sgv__filename', text: file.name }),
          el('div', {
            class: 'sgv__drop-hint',
            text: `${(file.size / 1024 / 1024).toFixed(1)} MB · location data is removed before upload`,
          }),
          el('div', { style: 'margin-top:0.6rem' }, [change]),
        ]),
      ]),
    );
  };

  const take = (file: File | undefined) => {
    if (!file) return;

    // Checked here as well as on the Worker: a client-side rejection is
    // instant and costs the visitor no upload time on a slow connection.
    if (file.size > MAX_BYTES) {
      slot.replaceChildren(
        message('That photo is larger than 10 MB. Please choose a smaller one.',
          'फोटो १० MB भन्दा ठूलो छ। सानो फोटो छान्नुहोस्।'),
      );
      onPick(null);
      return;
    }

    drop.hidden = true;
    show(file);
    onPick(file);
  };

  input.addEventListener('change', () => take(input.files?.[0]));

  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('sgv__drop--over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('sgv__drop--over'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('sgv__drop--over');
    take(event.dataTransfer?.files?.[0]);
  });

  return wrap;
}

function message(en: string, ne: string): HTMLElement {
  return el('div', { class: 'sgv__msg sgv__msg--error', role: 'alert' }, [
    el('div', { text: en }),
    el('div', { class: 'sgv__msg-ne', lang: 'ne', text: ne }),
  ]);
}

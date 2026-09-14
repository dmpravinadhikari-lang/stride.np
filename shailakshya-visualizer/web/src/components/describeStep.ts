/**
 * The open intake: say it however you like.
 *
 * A customer may type a sentence, photograph their plot, photograph their
 * survey map (naksa), or any mix. Whatever they give is parsed into the same
 * structured brief the form produces, and they then get to correct it before
 * anything is generated.
 *
 * The correction step is not politeness. The parse can be wrong, and a wrong
 * brief means a wrong house — and with generation billed per image, catching it
 * here is also the cheapest place to catch it.
 *
 * The form remains available and complete. Anyone who would rather tap through
 * defined choices than compose a sentence should not be made to type.
 */
import { el } from '../lib/dom.ts';

const EXAMPLES = [
  'I have 4 aana in Bhaktapur, road on the east. 3 bedrooms, two with attached bathroom, a puja room and parking for one car.',
  'Chaar aana jagga cha, 2.5 storey ghar banaune, 4 bedroom ra puja kotha chahincha, itta ko design man parcha.',
  'My land is 40 feet on the road and 60 feet deep. Single storey, two bedrooms, no parking.',
];

export interface DescribeOptions {
  onDescribe: (text: string, files: File[]) => void;
  onUseForm: () => void;
}

export function describeStep({ onDescribe, onUseForm }: DescribeOptions): HTMLElement {
  const text = el('textarea', {
    class: 'sgv__textarea',
    id: 'sgv-describe',
    rows: '5',
    placeholder: EXAMPLES[0],
  });

  const fileInput = el('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp',
    multiple: 'multiple',
    class: 'sgv__visually-hidden',
    id: 'sgv-landphoto',
  });

  const attached = el('div', { class: 'sgv__attached' });
  let files: File[] = [];

  const renderAttached = () => {
    attached.replaceChildren(
      ...files.map((file, index) => {
        const thumb = el('img', { src: URL.createObjectURL(file), alt: '' });
        thumb.addEventListener('load', () => URL.revokeObjectURL(thumb.src), { once: true });

        const remove = el('button', {
          class: 'sgv__attached-remove',
          type: 'button',
          'aria-label': `Remove ${file.name}`,
          text: '×',
        });
        remove.addEventListener('click', () => {
          files = files.filter((_, i) => i !== index);
          renderAttached();
        });

        return el('div', { class: 'sgv__attached-item' }, [thumb, remove]);
      }),
    );
  };

  fileInput.addEventListener('change', () => {
    // Two is all the parser reads, and each one is an upload on a phone
    // connection — there is no point accepting a gallery.
    files = [...files, ...Array.from(fileInput.files ?? [])].slice(0, 2);
    fileInput.value = '';
    renderAttached();
  });

  const attach = el('label', { class: 'sgv__btn sgv__btn--quiet', for: 'sgv-landphoto' }, [
    'Add a photo of your land or your map',
    el('span', { class: 'sgv__chip-ne', lang: 'ne', text: 'जग्गा वा नक्साको फोटो' }),
  ]);

  const submit = el('button', {
    class: 'sgv__btn sgv__btn--primary sgv__btn--lg',
    type: 'submit',
    text: 'Continue',
  });

  const useForm = el('button', {
    class: 'sgv__btn',
    type: 'button',
    text: 'Fill in a form instead',
  });
  useForm.addEventListener('click', onUseForm);

  const form = el('form', { class: 'sgv__form' }, [
    el('div', { class: 'sgv__section-block' }, [
      el('label', { class: 'sgv__label', for: 'sgv-describe' }, [
        'Describe what you want to build',
        el('span', { class: 'sgv__label-ne', lang: 'ne', text: 'के बनाउन चाहनुहुन्छ लेख्नुहोस्' }),
      ]),
      text,
      el('p', { class: 'sgv__hint' }, [
        'Nepali or English, however you would say it out loud. Land size, how many rooms, which side the road is on — whatever you know.',
      ]),
      el('div', { class: 'sgv__attach-row' }, [attach, fileInput]),
      attached,
      el('p', { class: 'sgv__hint' }, [
        'A photo helps us read the shape and the surroundings. Location data is removed before it leaves your phone. ',
        el('span', { class: 'ne', lang: 'ne', text: 'फोटोबाट स्थानको जानकारी हटाइन्छ।' }),
      ]),
    ]),
    el('div', { class: 'sgv__submit' }, [
      submit,
      useForm,
      el('p', { class: 'sgv__hint' }, [
        'You will see what we understood, and can change anything, before we design.',
      ]),
    ]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = text.value.trim();
    if (!value && files.length === 0) {
      text.focus();
      return;
    }
    onDescribe(value, files);
  });

  return el('div', { class: 'sgv__shell sgv__section' }, [
    el('h2', {}, [
      'Tell us what you need',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंलाई के चाहिन्छ भन्नुहोस्' }),
    ]),
    el('p', { class: 'sgv__lead' }, [
      'Write it in your own words, or add a photo of your land or your map. We will work out a house that fits.',
    ]),
    form,
  ]);
}

/** Shown above the prefilled form, so the parse is confirmed not assumed. */
export function understoodBanner(understood: string, missing: string[]): HTMLElement {
  const FRIENDLY: Record<string, string> = {
    areaValue: 'land size',
    areaUnit: 'land size',
    widthFt: 'frontage',
    depthFt: 'depth',
    roadSide: 'which side the road is on',
    floors: 'number of floors',
    bedrooms: 'number of bedrooms',
    attachedBathrooms: 'attached bathrooms',
    parkingCars: 'parking',
    stylePackId: 'style',
  };

  const gaps = [...new Set(missing.map((m) => FRIENDLY[m]).filter(Boolean))];

  return el('div', { class: 'sgv__msg sgv__msg--warn' }, [
    el('strong', { text: 'This is what we understood' }),
    understood ? el('p', { class: 'sgv__understood', text: understood }) : null,
    gaps.length > 0
      ? el('p', { class: 'sgv__hint' }, [
          `We guessed at: ${gaps.join(', ')}. Check those below and change anything that is wrong.`,
        ])
      : el('p', { class: 'sgv__hint', text: 'Check the details below and change anything that is wrong.' }),
  ]);
}

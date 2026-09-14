/**
 * Google sign-in gate.
 *
 * Shown after the customer has described what they want and before the design
 * appears. It therefore has to justify itself: the panel says what they are
 * about to get and what signing in is for, rather than presenting a bare button
 * in front of a wall.
 *
 * The credential goes straight to our Worker, which verifies it with Google
 * before issuing a session. Nothing here decides whether somebody is signed in;
 * the browser only reports what Google handed it.
 */
import { el } from '../lib/dom.ts';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

export interface AuthGateOptions {
  clientId: string;
  /** Echoed back so the person sees what they are signing in to see. */
  prompt?: string;
  onCredential: (credential: string) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let gsiLoading: Promise<void> | undefined;

/** Loaded once per page, and only when the gate is actually reached. */
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  gsiLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Google sign-in failed to load')));
    document.head.append(script);
  });

  return gsiLoading;
}

export function authGate({
  clientId,
  prompt,
  onCredential,
  onCancel,
}: AuthGateOptions): HTMLElement {
  const buttonSlot = el('div', { class: 'sgv__gate-button' });

  const back = el('button', {
    class: 'sgv__btn sgv__btn--quiet',
    type: 'button',
    text: 'Change what I asked for',
  });
  back.addEventListener('click', onCancel);

  const panel = el('div', { class: 'sgv__gate' }, [
    el('span', { class: 'sgv__gate-badge', 'aria-hidden': 'true', text: '🔑' }),
    el('h2', {}, [
      'Your design is ready',
      el('span', { class: 'sgv__ne', lang: 'ne', text: 'तपाईंको डिजाइन तयार छ' }),
    ]),
    el('p', { class: 'sgv__lead' }, [
      'Sign in with Google to see it. It takes one tap, and it means we can send your plans to you and pick up where you left off next time.',
    ]),
    prompt
      ? el('blockquote', { class: 'sgv__gate-quote' }, [
          el('span', { class: 'sgv__gate-quote-label', text: 'You asked for' }),
          el('p', { text: prompt }),
        ])
      : null,
    buttonSlot,
    el('p', { class: 'sgv__hint' }, [
      'We only ever see your name and email address. ',
      el('span', { class: 'ne', lang: 'ne', text: 'हामी नाम र इमेल मात्र हेर्छौं।' }),
    ]),
    el('div', { class: 'sgv__gate-back' }, [back]),
  ]);

  const unavailable = () =>
    buttonSlot.replaceChildren(
      el('div', { class: 'sgv__msg sgv__msg--error' }, [
        el('div', {
          text: 'Google sign-in could not load. Check your connection, or try another browser.',
        }),
        el('div', {
          class: 'sgv__msg-ne',
          lang: 'ne',
          text: 'Google साइन इन लोड भएन। इन्टरनेट जाँच्नुहोस्।',
        }),
      ]),
    );

  // The script can load and still render nothing — a misconfigured client id,
  // a blocked third-party frame. An empty box with no explanation is a dead
  // end, so anything that has not produced a button in time says so instead.
  const renderWatchdog = window.setTimeout(() => {
    if (!buttonSlot.firstElementChild) unavailable();
  }, 6000);

  void loadGsi()
    .then(() => {
      const id = window.google?.accounts?.id;
      if (!id) throw new Error('Google sign-in is unavailable');

      id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) onCredential(response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      id.renderButton(buttonSlot, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'center',
      });

      if (buttonSlot.firstElementChild) window.clearTimeout(renderWatchdog);
    })
    .catch(() => {
      window.clearTimeout(renderWatchdog);
      unavailable();
    });

  return el('div', { class: 'sgv__shell sgv__shell--narrow sgv__section' }, [panel]);
}

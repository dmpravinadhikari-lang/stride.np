/**
 * Tiny DOM helpers. No framework — SPEC §4 requires the widget to drop into an
 * existing site as one script tag, and a framework runtime would be most of the
 * bundle for a handful of screens.
 */

type Attrs = Record<string, string | number | boolean | undefined | null>;
type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;

    if (key === 'class') node.className = String(value);
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('--')) node.style.setProperty(key, String(value));
    else node.setAttribute(key, String(value));
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

/** Announce a state change to screen readers without moving focus. */
export function announce(region: HTMLElement, message: string): void {
  region.textContent = message;
}

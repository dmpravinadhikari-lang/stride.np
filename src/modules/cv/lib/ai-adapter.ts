import { activeProvider } from "@/lib/ai/provider";
import { runAi } from "@/lib/ai/run";
import type { Scope } from "@/lib/db/scope";

/**
 * The CV maker's AI surface, mapped onto STRIDE's metered one.
 *
 * The builder came from a codebase where AI was called directly and freely.
 * Here every AI call costs a consultancy money, so it has to go through
 * runAi, which checks the credit allowance, rate-limits the hour and records
 * what the call cost.
 *
 * That gives the CV maker two halves, matching how the rest of STRIDE is
 * split:
 *
 *   - Typing your own CV in, choosing a template and downloading it costs
 *     nothing to run, so it is open to anyone with no account.
 *   - Reading your certificates from a photo, expanding thin bullets and
 *     reviewing the result are real AI calls, so they need a consultancy
 *     behind them.
 *
 * A public visitor therefore gets a complete, working CV maker. What they do
 * not get is the ability to spend somebody else's credits.
 */

export type Attachment = { mediaType: string; base64: string };

/** Thrown when a public visitor reaches for one of the AI-backed steps. */
export class NeedsAccountError extends Error {
  constructor() {
    super("This step uses AI, so it comes with your consultancy's account.");
    this.name = "NeedsAccountError";
  }
}

/** Whether the switched-on provider can read an uploaded file at all. */
export function canReadDocuments(): boolean {
  return activeProvider().id === "anthropic-api";
}

export const providerId = () => activeProvider().id;
/** Alias: the ported builder calls this `provider`. */
export const provider = providerId;

/**
 * A plain completion, metered against the consultancy's allowance.
 * `scope` is null for a signed-out visitor, and that is a refusal rather than
 * a free call.
 */
export async function complete(
  scope: Scope | null,
  system: string,
  prompt: string,
  credits = 1,
): Promise<string> {
  if (!scope) throw new NeedsAccountError();
  const { text } = await runAi(scope, { module: "cv-maker", action: "complete", system, prompt, tier: "fast" }, credits);
  return text;
}

/**
 * Reading a certificate photo. Costs more than a text call because the image
 * carries far more tokens, so it is charged accordingly.
 */
export async function completeWithDocument(
  scope: Scope | null,
  system: string,
  prompt: string,
  file: Attachment,
  credits = 3,
): Promise<string> {
  if (!scope) throw new NeedsAccountError();
  if (!canReadDocuments()) {
    throw new Error("Reading documents needs the Anthropic API provider. The sample and CLI engines cannot take files.");
  }
  const { text } = await runAi(
    scope,
    { module: "cv-maker", action: "read_document", system, prompt, tier: "smart", attachment: file },
    credits,
  );
  return text;
}

/**
 * The contract between OfficeYak's features and whatever is answering them.
 *
 * Modules never import Claude, an API key, or a command line. They describe a
 * task; the platform decides who answers it. That is what makes "local CLI
 * today, Claude API tomorrow" a change to one environment variable.
 */
export type AiTask = {
  /** Which module is asking, recorded against usage. */
  module: string;
  /** What it is asking for, e.g. "sop.review". */
  action: string;
  /** Standing instructions for the model. */
  system: string;
  /** The actual request. */
  prompt: string;
  /** "smart" for judgement and scoring, "fast" for cheap mechanical work. */
  tier: "smart" | "fast";
  /** True when the caller needs JSON back and will parse it. */
  json?: boolean;
  maxTokens?: number;
  /**
   * A file for the model to read, such as a photograph of a certificate.
   * Only the Anthropic API provider can take one; the CLI and sample engines
   * refuse rather than silently ignoring it, because a silently ignored
   * attachment produces a confident answer about a document nobody read.
   */
  attachment?: { mediaType: string; base64: string };
};

export type AiResult = {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number;
  ms: number;
};

export type ProviderHealth = { ok: boolean; detail: string };

export interface AiProvider {
  id: string;
  label: string;
  /** Can this provider actually run right now? Shown in the admin panel. */
  health(): Promise<ProviderHealth>;
  complete(task: AiTask): Promise<AiResult>;
}

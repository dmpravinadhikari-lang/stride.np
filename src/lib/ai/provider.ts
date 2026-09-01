import type { AiProvider } from "@/lib/ai/types";
import { sampleProvider } from "@/lib/ai/providers/sample";
import { claudeCliProvider } from "@/lib/ai/providers/claude-cli";
import { anthropicApiProvider } from "@/lib/ai/providers/anthropic-api";

export const PROVIDERS: Record<string, AiProvider> = {
  sample: sampleProvider,
  "claude-cli": claudeCliProvider,
  "anthropic-api": anthropicApiProvider,
};

/** THE SWITCH. One environment variable decides who answers every AI request. */
export function activeProvider(): AiProvider {
  const id = (process.env.STRIDE_AI_PROVIDER || "sample").trim();
  return PROVIDERS[id] ?? sampleProvider;
}

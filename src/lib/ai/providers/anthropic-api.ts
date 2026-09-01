import type { AiProvider, AiResult, AiTask } from "@/lib/ai/types";
import { estimateCost } from "@/lib/ai/pricing";

/**
 * The real Claude API. This is what serves actual students — many at once,
 * with proper rate limits. Needs ANTHROPIC_API_KEY in .env.local.
 */

const modelFor = (tier: AiTask["tier"]) =>
  tier === "fast"
    ? process.env.STRIDE_API_MODEL_FAST || "claude-haiku-4-5-20251001"
    : process.env.STRIDE_API_MODEL_SMART || "claude-sonnet-5";

export const anthropicApiProvider: AiProvider = {
  id: "anthropic-api",
  label: "Claude API",

  async health() {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, detail: "ANTHROPIC_API_KEY is not set in .env.local." };
    }
    return { ok: true, detail: `Ready. Smart: ${modelFor("smart")}, fast: ${modelFor("fast")}.` };
  },

  async complete(task: AiTask): Promise<AiResult> {
    const started = Date.now();
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
    const model = modelFor(task.tier);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: task.maxTokens ?? 4096,
        system: task.system,
        messages: [{ role: "user", content: task.prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Claude API returned ${res.status}. ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const inTok = data.usage?.input_tokens ?? 0;
    const outTok = data.usage?.output_tokens ?? 0;

    return {
      text,
      provider: "anthropic-api",
      model,
      inputTokens: inTok,
      outputTokens: outTok,
      estCostUsd: estimateCost(model, inTok, outTok),
      ms: Date.now() - started,
    };
  },
};

import { spawn } from "node:child_process";
import type { AiProvider, AiResult, AiTask } from "@/lib/ai/types";
import { estimateCost, roughTokens } from "@/lib/ai/pricing";

/**
 * Talks to the `claude` command installed on this machine.
 *
 * Right for building and for demoing on a laptop. Wrong for real students: the
 * CLI runs one request at a time on one machine, so ten students starting a
 * mock interview together will queue behind each other. Switch
 * STRIDE_AI_PROVIDER to anthropic-api before anyone depends on it.
 */

const bin = () => process.env.STRIDE_CLAUDE_CLI_PATH || "claude";

function exec(args: string[], input: string, timeoutMs: number): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin(), args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      err += `\nTimed out after ${timeoutMs}ms`;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d) => (out += String(d)));
    child.stderr.on("data", (d) => (err += String(d)));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, out, err: `${err}\n${e.message}` });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, out, err });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export const claudeCliProvider: AiProvider = {
  id: "claude-cli",
  label: "Local Claude CLI",

  async health() {
    const { code, out, err } = await exec(["--version"], "", 15000);
    if (code !== 0) {
      return {
        ok: false,
        detail:
          `Could not run "${bin()}". Install it with: npm install -g @anthropic-ai/claude-code, ` +
          `then run "claude login" once in a terminal. (${err.trim().slice(0, 160)})`,
      };
    }
    return { ok: true, detail: `${out.trim()} — one request at a time; not for real load.` };
  },

  async complete(task: AiTask): Promise<AiResult> {
    const started = Date.now();
    const args = ["-p", "--output-format", "json", "--append-system-prompt", task.system];
    const model = process.env.STRIDE_CLAUDE_CLI_MODEL?.trim();
    if (model) args.push("--model", model);

    const { code, out, err } = await exec(args, task.prompt, 180000);
    if (code !== 0) {
      throw new Error(`Claude CLI failed (exit ${code}). ${err.trim().slice(0, 300)}`);
    }

    // Print mode with --output-format json wraps the answer; older builds just
    // print the text. Handle both rather than depending on one CLI version.
    let text = out.trim();
    let inTok = 0;
    let outTok = 0;
    let usedModel = model || "claude-cli";
    try {
      const parsed = JSON.parse(out) as {
        result?: string;
        model?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      if (typeof parsed.result === "string") text = parsed.result;
      if (parsed.model) usedModel = parsed.model;
      inTok = parsed.usage?.input_tokens ?? 0;
      outTok = parsed.usage?.output_tokens ?? 0;
    } catch {
      /* plain text output — fall through */
    }
    if (!inTok) inTok = roughTokens(task.system + task.prompt);
    if (!outTok) outTok = roughTokens(text);

    return {
      text,
      provider: "claude-cli",
      model: usedModel,
      inputTokens: inTok,
      outputTokens: outTok,
      // Charged to you as zero today; costed anyway so the meter is ready.
      estCostUsd: estimateCost("claude-sonnet-5", inTok, outTok),
      ms: Date.now() - started,
    };
  },
};

"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icon";
import {
  retryMail, runRuleNow, sendTestMail, toggleRule, type AutomationState,
} from "@/modules/automations/actions";

/**
 * The buttons on the automations screen.
 *
 * Each is a form posting to a server action rather than a fetch, so the page
 * works before the bundle has loaded and cannot get into a state where the
 * switch says one thing and the database another.
 */

export function RuleSwitch({ ruleId, on, label }: { ruleId: string; on: boolean; label: string }) {
  return (
    <form action={toggleRule}>
      <input type="hidden" name="rule_id" value={ruleId} />
      <input type="hidden" name="enabled" value={on ? "0" : "1"} />
      <button
        type="submit"
        aria-label={on ? `Turn off ${label}` : `Turn on ${label}`}
        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
          on
            ? "border-teal-700/30 bg-teal-100 text-teal-700 hover:bg-white"
            : "border-line-2 text-muted hover:bg-wash"
        }`}
      >
        <Icon name={on ? "check" : "plus"} size={14} />
        {on ? "On" : "Turn on"}
      </button>
    </form>
  );
}

export function RunNow({ ruleId, disabled }: { ruleId: string; disabled: boolean }) {
  const [state, act, pending] = useActionState<AutomationState, FormData>(runRuleNow, { ok: true });
  return (
    <form action={act} className="flex items-center gap-2">
      <input type="hidden" name="rule_id" value={ruleId} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line-2 px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-wash disabled:opacity-40"
      >
        {pending ? "Running" : "Run now"}
      </button>
      {state.message && (
        <span className={`max-w-[260px] text-[12px] ${state.ok ? "text-muted" : "text-danger-600"}`} role="status">
          {state.message}
        </span>
      )}
    </form>
  );
}

export function TestMail() {
  const [state, act, pending] = useActionState<AutomationState, FormData>(sendTestMail, { ok: true });
  return (
    <form action={act} className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-brand-500 px-4 text-[13.5px] font-semibold text-ink transition-colors hover:bg-brand-400 disabled:opacity-50"
      >
        {pending ? "Sending" : "Send me a test"}
      </button>
      {state.message && (
        <span className={`text-[12.5px] ${state.ok ? "text-teal-700" : "text-danger-600"}`} role="status">
          {state.message}
        </span>
      )}
    </form>
  );
}

export function Retry({ id }: { id: string }) {
  return (
    <form action={retryMail}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line-2 px-3 text-[12.5px] font-medium text-ink-2 hover:bg-wash"
      >
        Try again
      </button>
    </form>
  );
}

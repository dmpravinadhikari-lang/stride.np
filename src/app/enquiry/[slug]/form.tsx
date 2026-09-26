"use client";

import { useActionState, useState } from "react";
import { submitWalkIn, type WalkInState } from "@/modules/leads/actions";
import { Icon } from "@/components/Icon";

const initial: WalkInState = { ok: true };

/**
 * The form a student fills at reception, or on a link the office sends.
 *
 * TWO REQUIRED FIELDS AND EIGHT OPTIONAL ONES, and that split is the whole
 * design. A required field on a form somebody fills standing up, watched by a
 * parent, is a form that gets abandoned, and an abandoned form leaves the
 * office with nothing at all. A half-filled one leaves them a name and a
 * working number, which is a phone call.
 *
 * Everything optional is a button rather than a box, because a tablet on a
 * counter should not be asking anybody to type. "Not decided yet" is a real
 * answer and is offered: a required question with no honest answer is a
 * question that gets answered wrongly.
 */

const DESTINATIONS = ["Australia", "United Kingdom", "Canada", "United States", "New Zealand", "Ireland", "Japan", "South Korea", "Not decided yet"];
const LEVELS = ["+2 or A Levels", "Bachelor's", "Master's", "Diploma"];
const INTAKES = ["Next intake", "In six months", "Next year", "Not sure yet"];
const TESTS = ["IELTS", "PTE", "TOEFL", "Duolingo", "Not taken yet"];
const HEARD = ["Facebook", "Instagram", "TikTok", "Google", "A friend or family", "Walked past", "Somewhere else"];
const HEARD_ONLINE = ["Facebook", "Instagram", "TikTok", "Google", "A friend or family", "The office sent me this link", "Somewhere else"];

function Choice({
  name, options, value, onPick,
}: { name: string; options: readonly string[]; value: string; onPick: (v: string) => void }) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o} type="button" onClick={() => onPick(value === o ? "" : o)}
            aria-pressed={value === o}
            className={`min-h-[48px] rounded-full border px-5 text-[15px] transition-colors ${
              value === o
                ? "border-brand-500 bg-brand-500 font-semibold text-ink"
                : "border-line-2 bg-panel text-ink-2 hover:border-brand-400"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </>
  );
}

export function WalkInForm({
  slug, office, branches, channel = "walk_in",
}: {
  slug: string;
  office: string | null;
  branches: Array<{ id: string; name: string }>;
  channel?: "walk_in" | "online";
}) {
  const [state, action, pending] = useActionState(submitWalkIn, initial);
  const [destination, setDestination] = useState("");
  const [level, setLevel] = useState("");
  const [intake, setIntake] = useState("");
  const [test, setTest] = useState("");
  const [heard, setHeard] = useState("");
  const [branch, setBranch] = useState(branches[0]?.id ?? "");

  if (state.ok && state.message) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-100 text-teal-700">
          <Icon name="check" size={30} />
        </span>
        <h1 className="display mt-6 text-[30px]">{state.message}</h1>
        <p className="mt-3 text-[16px] text-ink-2">
          {channel === "online"
            ? "We have your number and will call you back."
            : "Please take a seat. A counsellor will come to you."}
        </p>
        <button
          type="button" onClick={() => window.location.reload()}
          className="mt-10 min-h-[52px] rounded-[10px] border border-line-2 px-7 text-[15px] font-semibold text-ink-2"
        >
          Next person
        </button>
      </div>
    );
  }

  const heardOptions = channel === "online" ? HEARD_ONLINE : HEARD;

  return (
    <form action={action} className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="channel" value={channel} />

      <h1 className="display text-[30px] leading-tight">
        {channel === "online" ? "Tell us about your plan" : "Welcome"}
      </h1>
      <p className="mt-2 text-[15.5px] text-muted">
        {office ? `${office}. ` : ""}Two answers are enough. The rest helps us prepare before we sit with you.
      </p>

      {state.message && !state.ok && (
        <p className="mt-5 rounded-xl border border-danger-600/30 bg-danger-100 px-4 py-3 text-[14px] text-danger-600" role="alert">
          {state.message}
        </p>
      )}

      {/* the two that matter */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">Your name</span>
          <input
            name="full_name" required autoFocus autoComplete="name"
            className="min-h-[56px] rounded-xl border border-line-2 bg-panel px-4 text-[17px] text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">Phone number</span>
          <input
            name="phone" required inputMode="tel" autoComplete="tel" placeholder="98xxxxxxxx"
            className="min-h-[56px] rounded-xl border border-line-2 bg-panel px-4 text-[17px] text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      {branches.length > 1 && (
        <div className="mt-6">
          <span className="text-[14px] font-medium text-ink">Which office</span>
          <input type="hidden" name="branch_id" value={branch} />
          <div className="mt-3 flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id} type="button" onClick={() => setBranch(b.id)} aria-pressed={branch === b.id}
                className={`min-h-[48px] rounded-full border px-5 text-[15px] transition-colors ${
                  branch === b.id
                    ? "border-brand-500 bg-brand-500 font-semibold text-ink"
                    : "border-line-2 bg-panel text-ink-2 hover:border-brand-400"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* everything below is optional, and every answer is one tap */}
      <div className="mt-10 flex flex-col gap-7 border-t border-line pt-8">
        <div>
          <span className="text-[14px] font-medium text-ink">Where would you like to go?</span>
          <div className="mt-3"><Choice name="destination" options={DESTINATIONS} value={destination} onPick={setDestination} /></div>
        </div>
        <div>
          <span className="text-[14px] font-medium text-ink">What are you going to study?</span>
          <div className="mt-3"><Choice name="study_level" options={LEVELS} value={level} onPick={setLevel} /></div>
        </div>
        <div>
          <span className="text-[14px] font-medium text-ink">When are you hoping to go?</span>
          <div className="mt-3"><Choice name="intake" options={INTAKES} value={intake} onPick={setIntake} /></div>
        </div>
        <div>
          <span className="text-[14px] font-medium text-ink">Have you taken an English test?</span>
          <div className="mt-3"><Choice name="english_test" options={TESTS} value={test} onPick={setTest} /></div>
        </div>
        <div>
          <span className="text-[14px] font-medium text-ink">How did you hear about us?</span>
          <div className="mt-3"><Choice name="source" options={heardOptions} value={heard} onPick={setHeard} /></div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">Anything else we should know?</span>
          <textarea
            name="note" rows={3}
            className="rounded-xl border border-line-2 bg-panel px-4 py-3 text-[16px] text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-10 border-t border-line bg-canvas/95 px-5 py-4 backdrop-blur">
        <button
          type="submit" disabled={pending}
          className="min-h-[56px] w-full rounded-[10px] bg-brand-500 px-8 text-[17px] font-medium text-ink transition-colors hover:bg-brand-400 disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Sending…" : "Done"}
        </button>
      </div>
    </form>
  );
}

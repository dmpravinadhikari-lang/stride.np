import { requireUser } from "@/lib/auth/current";
import { ensureProfile, profileCompleteness } from "@/lib/profile";
import { ProfileForm } from "./form";
import { Alert, Meter } from "@/components/ui";

export const metadata = { title: "My profile — STRIDE" };

export default async function ProfilePage({
  searchParams,
}: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const user = await requireUser();
  const profile = ensureProfile(user.id, user.tenantId);
  const { pct, missing } = profileCompleteness(profile);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Your profile</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          This is the file the AI reads before it interviews you or drafts your statement. The more
          honest and specific it is, the harder the practice — and the easier the real thing.
        </p>
      </header>

      {welcome && (
        <Alert tone="brand" title="Welcome to STRIDE">
          Fill this in once. Your mock interviewer will use it to ask about your actual sponsor and
          your actual course, instead of generic questions you'd never be asked.
        </Alert>
      )}

      <div className="rounded-2xl border border-line bg-panel px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-ink">Completeness</span>
          <span className="num text-[13px] text-muted">{pct}%</span>
        </div>
        <div className="mt-2"><Meter value={pct} tone={pct === 100 ? "teal" : pct > 60 ? "brand" : "gold"} /></div>
        {missing.length > 0 && (
          <p className="mt-2 text-[12.5px] text-muted">Missing: {missing.join(", ")}</p>
        )}
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}

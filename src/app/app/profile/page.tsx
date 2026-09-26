import { requireUser } from "@/lib/auth/current";
import { ensureProfile } from "@/lib/profile";
import { ProfileForm } from "./form";
import { Alert, PageHeader } from "@/components/ui";
import { isStaff, ROLE_LABEL } from "@/lib/auth/roles";
import { NotificationSettings } from "./notifications";
import { MyDetails, PasswordCard } from "./account";
import { ConsultancyCard } from "./consultancy";
import { consultancyUsage, otherSessionCount } from "@/modules/account/actions";
import { allowanceFor } from "@/lib/usage";
import { planOf } from "@/lib/plans";
import { BRAND } from "@/lib/brand";
import { one } from "@/lib/db";
import { PinSettings } from "./pin";
import { hasPin } from "@/modules/kiosk/actions";
import { myScorecard, officeMonth } from "@/modules/account/scorecard";
import { ScoreCard } from "./scorecard";

export const metadata = { title: "My profile, Stride" };

export default async function ProfilePage({
  searchParams,
}: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const user = await requireUser();
  const staff = isStaff(user.role);
  const profile = ensureProfile(user.id, user.tenantId);
  const studentAuth = one<{ auth_method: string }>("SELECT auth_method FROM users WHERE id = ?", user.id);

  // A counsellor has no study plan, so the student questionnaire is not shown
  // to them. What they do have is a mailbox, and a say in what lands in it.
  if (staff) {
    const admin = user.role === "tenant_admin" || user.role === "super_admin";
    const me = one<{ auth_method: string; phone: string | null }>(
      "SELECT auth_method, phone FROM users WHERE id = ?", user.id,
    );
    const usage = admin ? await consultancyUsage() : null;
    const credits = admin
      ? allowanceFor({
          tenantId: user.tenantId, tenantKind: user.tenantKind, tenantPlan: user.tenantPlan,
          userId: user.id, studentPlan: user.studentPlan,
        })
      : null;

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Your account"
          sub={`${ROLE_LABEL[user.role]} at ${user.tenantName}${user.branchName ? `, ${user.branchName}` : ""}`}
        />

        <ScoreCard
          card={myScorecard(user.id, user.tenantId)}
          name={user.fullName}
          office={admin ? { name: user.tenantName, ...officeMonth(user.tenantId) } : null}
        />

        <MyDetails
          fullName={user.fullName} phone={me?.phone ?? null} email={user.email}
          role={ROLE_LABEL[user.role]} office={user.branchName ?? "No office set"}
        />
        <PasswordCard
          google={me?.auth_method === "google"}
          otherSessions={await otherSessionCount()}
        />
        <PinSettings hasPin={await hasPin()} />
        <NotificationSettings />

        {admin && usage?.tenant && credits && (
          <ConsultancyCard
            tenant={usage.tenant}
            domain={BRAND.domain}
            plan={{
              label: planOf(user.tenantPlan).label,
              priceNpr: planOf(user.tenantPlan).priceNpr,
              maxStudents: planOf(user.tenantPlan).maxStudents,
              maxBranches: planOf(user.tenantPlan).maxBranches,
              monthlyCredits: planOf(user.tenantPlan).monthlyCredits,
            }}
            usage={{
              students: usage.students, offices: usage.offices, staff: usage.staff,
              credits: { used: credits.used, allowance: credits.allowance },
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Your profile</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          This is the file the AI reads before it interviews you or drafts your statement. The more
          honest and specific it is, the harder the practice, and the easier the real thing.
        </p>
      </header>

      {welcome && (
        <Alert tone="brand" title="Welcome to Stride">
          Fill this in once. Your mock interviewer will use it to ask about your actual sponsor and
          your actual course, instead of generic questions you'd never be asked.
        </Alert>
      )}

      {/* The completeness meter lives inside the form, where it can move as the
          student answers rather than only after a save. */}
      <ProfileForm profile={profile} />

      {/*
        A student can change their own password.
        
        The invitation email tells them to, in these words: "Profile, then
        Password". There was no such thing on this page, so every student who
        followed the instruction found nothing and carried on using the
        password a counsellor can read off a screen.
      */}
      <PasswordCard
        google={studentAuth?.auth_method === "google"}
        otherSessions={await otherSessionCount()}
      />

      <NotificationSettings />
    </div>
  );
}

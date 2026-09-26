import { requireUser } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { EMAIL_KINDS, EMAIL_KIND_IDS } from "@/lib/email/kinds";
import { prefsFor } from "@/lib/email/notify";
import { saveEmailPrefs } from "@/lib/email/actions";
import { Button, Card } from "@/components/ui";
import { activeEmailProvider } from "@/lib/email/provider";

/**
 * What we are allowed to email this person about.
 *
 * Everything is on until somebody turns it off, and the switch is here rather
 * than in an admin screen: the person who gets the email is the one who
 * decides whether it is useful.
 */
export async function NotificationSettings() {
  const user = await requireUser();
  const prefs = prefsFor(user.id);
  const staff = isStaff(user.role);
  const admin = user.role === "tenant_admin" || user.role === "super_admin";

  const kinds = EMAIL_KIND_IDS.filter((id) => {
    const k = EMAIL_KINDS[id];
    if (k.staffOnly && !staff) return false;
    if (k.adminOnly && !admin) return false;
    return true;
  });

  const provider = activeEmailProvider();

  return (
    <Card className="p-5">
      <h2 className="h-tight text-[17px]">Email me about</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        Sent to {user.email}. Nothing is ever emailed to you about something you did yourself.
      </p>

      <form action={saveEmailPrefs} className="mt-4 flex flex-col gap-2">
        {kinds.map((id) => {
          const on = prefs[id] ?? true;
          return (
            <label
              key={id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 transition-colors has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500"
            >
              <input
                type="checkbox" name="kind" value={id} defaultChecked={on}
                className="mt-0.5 h-[18px] w-[18px] accent-[var(--color-brand-500)]"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-ink">{EMAIL_KINDS[id].label}</span>
                <span className="block text-[13px] leading-snug text-muted">{EMAIL_KINDS[id].blurb}</span>
              </span>
            </label>
          );
        })}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button type="submit">Save</Button>
          <span className="text-[12.5px] text-muted">
            {provider.id === "outbox"
              ? "Mail is going to the local outbox on this machine, not to real inboxes."
              : `Sending through ${provider.label}.`}
          </span>
        </div>
      </form>
    </Card>
  );
}

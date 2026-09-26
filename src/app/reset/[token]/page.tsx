import Link from "next/link";
import { Logo } from "@/components/Logo";
import { checkToken } from "@/lib/auth/reset";
import { Alert } from "@/components/ui";
import { ResetForm } from "./form";

export const metadata = { title: "Set a new password, STRIDE" };
export const dynamic = "force-dynamic";

/**
 * Setting the new password.
 *
 * The link is checked before the form is drawn, so somebody with a stale link
 * is told so immediately rather than typing a password twice and then being
 * refused.
 */
export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = checkToken(token);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-12">
      <Logo href="/" />
      {check.ok ? (
        <>
          <div>
            <h1 className="display text-[26px]">Set a new password</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              For {check.name}. Everywhere this account is signed in will be signed out.
            </p>
          </div>
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <h1 className="display text-[26px]">That link no longer works</h1>
          <Alert tone="gold">
            {check.why === "expired"
              ? "Links last an hour, and this one is older than that."
              : check.why === "used"
                ? "This link has already been used to set a password."
                : "We do not recognise this link."}
          </Alert>
          <Link
            href="/forgot"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-500 px-5 text-[14.5px] font-semibold text-white hover:bg-brand-600"
          >
            Send me a new link
          </Link>
        </>
      )}
      <Link href="/login" className="text-[13px] text-muted hover:text-brand-600">← Back to the sign-in page</Link>
    </main>
  );
}

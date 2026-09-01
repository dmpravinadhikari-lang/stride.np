import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./form";
import { GoogleButton } from "@/components/GoogleButton";
import { googleConfigured } from "@/lib/auth/google";
import { Alert } from "@/components/ui";
import { currentBranch, requestedBranchSlug } from "@/lib/tenancy/branch";

export const metadata = {
  title: "Login — STRIDE",
  // An account page has no business in search results.
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  "google-not-configured": "Google sign-in is not set up on this site yet. Use your email and password.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-bad-state": "That sign-in link had expired or did not match. Please try again.",
  "google-exchange-failed": "Google could not complete the sign-in. Please try again.",
  "google-email-unverified": "That Google account's email address is not verified, so it cannot be used to sign in.",
  "google-no-code": "Google did not send anything back. Please try again.",
  "account-disabled": "This account has been switched off. Contact your consultancy.",
  "no-account": "No STRIDE account uses that Google address. Your consultancy opens your account for you \u2014 ask them to add you, and the details arrive by email.",
};

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const branch = await currentBranch();
  const wrongAddress = !branch && (await requestedBranchSlug());

  return (
    <AuthShell
      title={branch ? "Welcome back" : "Sign in"}
      sub={
        branch
          ? `Your file with ${branch.name} — where your application has reached, and what is still outstanding.`
          : "Pick up where you left off — your drafts, scores and interview reports are all here."
      }
      branch={branch ? { name: branch.name, accent: branch.accent_color } : null}
      footer={
        // Students never sign themselves up, so offering it would send them
        // down a road that ends in a form they are not allowed to submit.
        branch
          ? <>Cannot get in? Ask {branch.name} to resend your details.</>
          : <>Run a consultancy? <Link href="/signup" className="inline-flex min-h-11 items-center px-1 font-semibold text-brand-600 hover:underline sm:min-h-0 sm:px-0">Set up your branch</Link></>
      }
    >
      {wrongAddress && (
        <div className="mb-4">
          <Alert tone="gold">
            No consultancy uses the address <strong>{wrongAddress}</strong>. Check the link your
            consultancy sent you — it will look like <em>yourconsultancy</em>.stride.np.
          </Alert>
        </div>
      )}

      {error && <div className="mb-4"><Alert tone="danger">{ERRORS[error] ?? "Sign-in did not work. Please try again."}</Alert></div>}

      {googleConfigured() && (
        <div className="mb-5 flex flex-col gap-4">
          <GoogleButton />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[12px] text-muted">or with your email</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      <LoginForm />
    </AuthShell>
  );
}

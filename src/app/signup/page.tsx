import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./form";

export const metadata = {
  title: "Set up your consultancy — STRIDE",
  robots: { index: false, follow: false },
};

/**
 * Consultancies only.
 *
 * Students reach STRIDE through the consultancy advising them — that is what
 * gives their file a counsellor and someone accountable for it. There is no
 * student form here to fill in by mistake.
 */
export default function SignupPage() {
  return (
    <AuthShell
      title="Set up your consultancy"
      sub="Your own address, your students, your records. Free to set up on the Starter plan — no card, and nothing to cancel."
      footer={
        <>
          Already set up?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center px-1 font-semibold text-brand-600 hover:underline sm:min-h-0 sm:px-0">
            Log in
          </Link>
          <br />
          <span className="mt-1 inline-block text-[12.5px]">
            A student? Your consultancy opens your account and emails you the details.
          </span>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}

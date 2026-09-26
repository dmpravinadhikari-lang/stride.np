import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";
import { ForgotForm } from "./form";

export const metadata = { title: "Forgotten password, Stride" };

/**
 * The way back in, without asking anybody.
 *
 * Deliberately plain and short: whoever is on this page is locked out, is
 * probably late for something, and needs one box and one button.
 */
export default function ForgotPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-12">
      <Logo href="/" />
      <div>
        <h1 className="display text-[26px]">Forgotten your password</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          Type the email you sign in with. If it has an account, a link to set a new password is on
          its way. The link works once and lasts an hour.
        </p>
      </div>

      <ForgotForm />

      <div className="flex flex-col gap-1.5 text-[13.5px] text-muted">
        <span>Remembered it? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></span>
        <span>
          A student, and not sure which address? Ask your consultancy: they can send your details
          again from your file.
        </span>
      </div>

      <Link href="/" className="text-[13px] text-muted hover:text-brand-600">← Back to {BRAND.domain}</Link>
    </main>
  );
}

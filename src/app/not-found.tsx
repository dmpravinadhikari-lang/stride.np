import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Not found, STRIDE" };

/**
 * The page somebody lands on when an address is wrong.
 *
 * Next's own is a bare line of text on white, which reads as the whole product
 * being broken rather than one address being wrong. Since a consultancy has
 * nobody to ask, this says what happened in one line and then offers the four
 * doors anybody arriving here actually wants.
 */
export default function NotFound() {
  const doors = [
    { href: "/", label: "The front page", hint: "What STRIDE is, and what it costs", icon: "home" as const },
    { href: "/app", label: "My console", hint: "If you are already signed in", icon: "students" as const },
    { href: "/login", label: "Sign in", hint: "Staff and students", icon: "user" as const },
    { href: "/signup", label: "Set up a consultancy", hint: "Free on the Starter plan", icon: "plus" as const },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-7 px-5 py-14">
      <Logo href="/" />
      <div>
        <h1 className="display text-[28px] leading-tight">That page is not here</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          The address may have changed, or it may have been typed slightly differently. Nothing is
          wrong with your account.
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {doors.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5 transition-colors hover:border-brand-400"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={d.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink">{d.label}</span>
                <span className="block text-[13px] text-muted">{d.hint}</span>
              </span>
              <Icon name="arrow" size={16} className="text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-[13px] text-muted">
        A student who cannot find their consultancy&rsquo;s page should look for the link in the
        email their counsellor sent. It looks like <em>yourconsultancy</em>.{BRAND.domain}.
      </p>
    </main>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "You are offline, OfficeYak", robots: { index: false } };

export default function Offline() {
  return (
    <main className="wash flex min-h-screen items-center justify-center px-5">
      <div className="max-w-md text-center">
        <div className="flex justify-center"><Logo href="/" /></div>
        <h1 className="display mt-8 text-[30px]">No connection right now.</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
          Nothing you have entered is lost. It is saved on the server and will be there when the
          signal comes back. Try again in a moment.
        </p>
        <p className="mt-6 text-[13px] text-muted">
          If this keeps happening on mobile data, the free tools are light enough to work on a weak
          connection once the page has loaded once.
        </p>
        <Link href="/"
          className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white">
          Try again
        </Link>
      </div>
    </main>
  );
}

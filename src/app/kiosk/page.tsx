import Link from "next/link";
import { currentDevice, staffAtDevice } from "@/modules/kiosk/device";
import { KioskClock } from "./clock";
import { Icon } from "@/components/Icon";

/**
 * The clock on the front desk.
 *
 * Whoever holds this device can name the staff of one office and punch their
 * clock, and that is all: no student, no document, no salary, no other
 * office. A device that is not enrolled sees a page telling it to ask a
 * manager, never a login form, because a login form on a shared tablet is how
 * a shared tablet ends up holding somebody's password.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Clock", robots: { index: false, follow: false } };

export default async function KioskPage() {
  const device = await currentDevice();

  if (!device) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-wash text-muted">
            <Icon name="clock" size={26} />
          </span>
          <h1 className="display mt-5 text-[26px]">This device is not set up yet</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            A manager signs in on this tablet once and chooses which office it belongs to. After
            that, everybody clocks in with a PIN and nobody has to type a password at the counter.
          </p>
          <Link
            href="/app/kiosk"
            className="mt-7 inline-flex min-h-[48px] items-center rounded-full bg-brand-600 px-6 text-[15px] font-medium text-white"
          >
            Set up this device
          </Link>
        </div>
      </main>
    );
  }

  const people = staffAtDevice(device);

  return (
    <main className="min-h-screen bg-canvas">
      <div className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <span className="h-tight text-[16px] text-ink">{device.tenantName}</span>
          <span className="text-[13px] text-muted">{device.branchName} · {device.label}</span>
        </div>
      </div>
      <div className="mx-auto max-w-4xl">
        <KioskClock people={people} office={device.branchName} />
      </div>
    </main>
  );
}

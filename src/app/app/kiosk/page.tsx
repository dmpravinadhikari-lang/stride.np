import Link from "next/link";
import { requirePermission } from "@/lib/auth/current";
import { all } from "@/lib/db";
import { Card, PageHeader, Panel, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { whenText } from "@/lib/dates";
import { currentDevice, devicesFor } from "@/modules/kiosk/device";
import { retire } from "@/modules/kiosk/actions";
import { DeviceSetup } from "./setup";

export const metadata = { title: "Front desk clock, OfficeYak" };
export const dynamic = "force-dynamic";

/**
 * Managing the shared clocks.
 *
 * Three people at one counter typing an email and a password each is three
 * people who stop clocking in. This is the screen that removes that.
 */
export default async function KioskAdminPage() {
  const user = await requirePermission("branch:settings");
  const branches = all<{ id: string; name: string }>(
    "SELECT id, name FROM branches WHERE tenant_id = ? AND active = 1 ORDER BY is_head_office DESC, name",
    user.tenantId,
  );
  const here = await currentDevice();
  const devices = devicesFor(user.tenantId);
  const withoutPin = all<{ full_name: string }>(
    `SELECT full_name FROM users
      WHERE tenant_id = ? AND active = 1 AND role IN ('counsellor','tenant_admin') AND pin_hash IS NULL
      ORDER BY full_name`,
    user.tenantId,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Front desk clock"
        sub="A tablet at the counter that anybody can clock in on with a PIN, without typing a password."
      />

      <Card className="p-5">
        <h2 className="h-tight text-[17px]">Set up the device you are holding</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          Do this on the tablet itself. It is remembered on that device only, and it can do nothing
          except name the staff of that office and work their clock.
        </p>
        <div className="mt-4">
          <DeviceSetup
            branches={branches}
            enrolled={here ? { branchName: here.branchName, label: here.label } : null}
          />
        </div>
      </Card>

      {devices.length > 0 && (
        <Panel title="Devices in service" note="Retire one and it stops working immediately.">
          <ul className="divide-y divide-line">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="text-[14px] font-medium text-ink">{d.label}</span>
                <span className="text-[13px] text-muted">{d.branch_name}</span>
                <span className="ml-auto text-[12.5px] text-muted">
                  {d.last_seen_at ? `Last used ${whenText(d.last_seen_at.slice(0, 10))}` : "Never used"}
                </span>
                <form action={retire}>
                  <input type="hidden" name="id" value={d.id} />
                  <Button type="submit" variant="danger" size="sm">Retire</Button>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {withoutPin.length > 0 && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">Still to set a PIN</h2>
          <p className="mt-1 text-[13.5px] text-muted">
            Each person sets their own, on their profile page. Nobody, including you, can read it
            afterwards.
          </p>
          <p className="mt-3 text-[14px] text-ink-2">{withoutPin.map((p) => p.full_name).join(", ")}</p>
        </Card>
      )}

      <p className="text-[13px] text-muted">
        <Link
          href="/kiosk"
          className="inline-flex min-h-[32px] items-center rounded-full px-2 font-medium text-brand-600 hover:bg-brand-50"
        >
          Open the clock
        </Link>
        {" "}on this device once it is set up, and leave it on that page.
      </p>
    </div>
  );
}

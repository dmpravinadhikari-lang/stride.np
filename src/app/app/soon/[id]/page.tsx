import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { moduleById } from "@/lib/modules/registry";
import { planOf } from "@/lib/plans";
import { Card, Chip, LinkButton } from "@/components/ui";

export default async function SoonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = moduleById(id);
  if (!mod) notFound();
  const user = await requireUser();
  const planId = user.tenantPlan;
  const onPlan = mod.plans.includes(planId as never);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-8 text-center">
        <div className="text-4xl" aria-hidden>{mod.icon}</div>
        <h1 className="display mt-4 text-[28px]">{mod.name}</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">{mod.summary}</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {mod.status === "planned" && <Chip tone="brand">Arriving in phase {mod.phase}</Chip>}
          {!onPlan && <Chip tone="gold">Needs {mod.plans.map((p) => planOf(p).label).join(" or ")}</Chip>}
        </div>

        <p className="mx-auto mt-6 max-w-md text-[13.5px] leading-relaxed text-muted">
          This module is already registered on the platform — its permissions, plan rules and usage
          metering are written. Only the screens are still to come.
        </p>

        <div className="mt-7">
          <LinkButton href="/app" variant="secondary" size="sm">← Back to dashboard</LinkButton>
        </div>
      </Card>
    </div>
  );
}

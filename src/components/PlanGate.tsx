import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PLANS, cheapestWith, planOf, type PlanFeature } from "@/lib/plans";

/**
 * What somebody sees when a screen is not on their plan.
 *
 * Not a 404 and not a locked padlock with no way out. It says what the screen
 * does, which plan carries it, and what that costs, because the person
 * looking at it is usually the person who decides whether to pay.
 */
export function PlanGate({
  feature, title, blurb,
}: { feature: PlanFeature; title: string; blurb: string }) {
  const needed = cheapestWith(feature);
  const plan = PLANS[needed];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} sub={blurb} />
      <Card className="p-6">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-50 text-accent-600">
          <Icon name="lock" size={20} />
        </span>
        <h2 className="h-tight mt-4 text-[18px]">This comes with the {plan.label} plan</h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2">
          {blurb} It is included from {plan.label} upward, at NPR{" "}
          <span className="num font-medium text-ink">{plan.priceNpr.toLocaleString("en-IN")}</span> a month for the
          whole office.
        </p>
        <p className="mt-3 text-[13.5px] text-muted">
          You are on {planOf("starter").label === plan.label ? "a lower plan" : "the Starter plan"}. Nothing you
          have already entered is affected by moving up, and you can move back down again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/#pricing"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-brand-500 px-5 text-[13.5px] font-medium text-ink hover:bg-brand-400"
          >
            See what {plan.label} includes <Icon name="arrow" size={15} />
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-[40px] items-center rounded-[10px] border border-line-2 px-5 text-[13.5px] font-medium text-ink-2 hover:border-brand-400 hover:text-brand-600"
          >
            Back to my day
          </Link>
        </div>
      </Card>
    </div>
  );
}

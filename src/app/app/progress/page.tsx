import { requireUser } from "@/lib/auth/current";
import { redirect } from "next/navigation";
import { readinessFor, weeklyStreak } from "@/lib/gamify/readiness";
import { achievementsFor, nextAchievement } from "@/lib/gamify/achievements";
import { ReadinessPanel, AchievementWall } from "@/components/Readiness";
import { Card } from "@/components/ui";

export const metadata = { title: "My progress" };

export default async function ProgressPage() {
  const user = await requireUser();
  // Staff have the pipeline for this; a counsellor does not have a readiness
  // score of their own to look at.
  if (user.role !== "student") redirect("/app/pipeline");

  const readiness = readinessFor(user.id, user.tenantId);
  const streak = weeklyStreak(user.id);
  const achievements = achievementsFor(user.id);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="display text-[30px]">How far you have got</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Measured on what is finished, steps ticked, documents your counsellor has verified,
          bands actually scored. It does not go up for opening the app.
        </p>
      </header>

      <ReadinessPanel
        readiness={readiness}
        streak={streak}
        achievements={achievements}
        nextUp={nextAchievement(achievements)}
      />

      <Card className="p-5 sm:p-6">
        <h2 className="h-tight text-[17px]">Milestones</h2>
        <p className="mt-1 text-[13px] text-muted">
          Thirteen things worth reaching between deciding and departing.
        </p>
        <div className="mt-5">
          <AchievementWall achievements={achievements} />
        </div>
      </Card>
    </div>
  );
}

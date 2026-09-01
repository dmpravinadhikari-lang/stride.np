import { all, run } from "@/lib/db";

/**
 * Counting free-tool use without tracking anybody.
 *
 * Two integers per tool per day. That is the entire record. It answers "is the
 * cost calculator worth the maintenance" and "which guide should we write
 * next", and it cannot answer "who used it" because nothing identifying is
 * ever written.
 */

const today = () => new Date().toISOString().slice(0, 10);

export function countTool(toolId: string, kind: "opened" | "completed"): void {
  // A bad tool id would create junk rows forever, so the shape is constrained.
  if (!/^[a-z0-9-]{2,40}$/.test(toolId)) return;
  try {
    run(
      `INSERT INTO tool_usage (tool_id, day, ${kind}) VALUES (?,?,1)
       ON CONFLICT(tool_id, day) DO UPDATE SET ${kind} = ${kind} + 1`,
      toolId, today(),
    );
  } catch {
    // Never let a counter break a page that works.
  }
}

export type ToolStat = {
  toolId: string;
  opened: number;
  completed: number;
  completionRate: number;
};

/** Totals over the last `days`, busiest first. */
export function toolStats(days = 30): ToolStat[] {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  return all<{ tool_id: string; opened: number; completed: number }>(
    `SELECT tool_id, SUM(opened) AS opened, SUM(completed) AS completed
       FROM tool_usage WHERE day >= ? GROUP BY tool_id ORDER BY opened DESC`,
    since,
  ).map((r) => ({
    toolId: r.tool_id,
    opened: r.opened,
    completed: r.completed,
    completionRate: r.opened > 0 ? Math.round((r.completed / r.opened) * 100) : 0,
  }));
}

/**
 * What a low completion rate on a given tool tends to mean. Stated here rather
 * than left for the reader to guess at.
 */
export function readTool(s: ToolStat): string {
  if (s.opened < 20) return "Too few visits to read anything into yet.";
  if (s.completionRate >= 60) return "People who open this finish it. It is doing its job.";
  if (s.completionRate >= 30) return "A third to a half give up partway. Usually the form asks for something they do not have to hand.";
  return "Most people open this and leave without an answer. Either it asks too much up front, or it is not the tool they thought it was.";
}

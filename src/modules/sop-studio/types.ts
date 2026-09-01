export type Severity = "critical" | "warning" | "note";

export type SopSection = { heading: string; body: string };
export type SopWarning = { severity: Severity; title: string; detail: string };
export type SopDraft = { sections: SopSection[]; warnings: SopWarning[] };

export type SopCriterion = { key: string; label: string; score: number; comment: string };
export type SopFinding = { severity: Severity; title: string; detail: string; quote?: string };
export type SopIntegrity = { aiLikelihood: number; clicheCount: number; notes: string[] };
export type SopReview = {
  overall: number;
  criteria: SopCriterion[];
  findings: SopFinding[];
  integrity: SopIntegrity;
};

export const EMPTY_REVIEW: SopReview = {
  overall: 0, criteria: [], findings: [],
  integrity: { aiLikelihood: 0, clicheCount: 0, notes: [] },
};

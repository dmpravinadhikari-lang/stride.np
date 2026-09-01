export type CriterionScore = { key: string; label: string; band: number; comment: string };
export type Annotation = { quote: string; issue: string; fix: string };

export type WritingScore = {
  band: number;
  criteria: CriterionScore[];
  annotations: Annotation[];
  summary: string;
  /** The two things costing the most marks, in order. */
  fixFirst: string[];
};

export type SpeakingScore = {
  band: number;
  criteria: CriterionScore[];
  summary: string;
  perAnswer: Array<{ idx: number; note: string }>;
  fixFirst: string[];
};

export type AttemptReport = {
  summary: string;
  strengths: string[];
  drills: Array<{ skill: string; title: string; detail: string }>;
};

export const EMPTY_WRITING: WritingScore = { band: 0, criteria: [], annotations: [], summary: "", fixFirst: [] };
export const EMPTY_SPEAKING: SpeakingScore = { band: 0, criteria: [], summary: "", perAnswer: [], fixFirst: [] };
export const EMPTY_REPORT: AttemptReport = { summary: "", strengths: [], drills: [] };

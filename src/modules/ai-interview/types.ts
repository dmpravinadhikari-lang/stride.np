export type Severity = "critical" | "warning" | "note";

export type NextQuestion = { question: string; intent: string; isFollowup: boolean };
export type AnswerEvaluation = {
  score: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  modelAnswer: string;
};
export type InterviewReport = {
  overall: number;
  readiness: "ready" | "nearly" | "not_ready";
  verdict: string;
  strengths: string[];
  risks: Array<{ severity: Severity; title: string; detail: string }>;
  nextSteps: string[];
};

export const EMPTY_EVAL: AnswerEvaluation = {
  score: 0, verdict: "", strengths: [], weaknesses: [], redFlags: [], modelAnswer: "",
};
export const EMPTY_REPORT: InterviewReport = {
  overall: 0, readiness: "not_ready", verdict: "", strengths: [], risks: [], nextSteps: [],
};

export const READINESS_LABEL: Record<InterviewReport["readiness"], string> = {
  ready: "Ready to sit it",
  nearly: "Nearly there",
  not_ready: "Not ready yet",
};

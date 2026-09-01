/**
 * Static reference data only — no database import.
 *
 * This file is imported by a client component, so anything that reaches into
 * node:fs or the database must stay out of it. Keeping the split explicit is
 * what stops a stray import breaking the whole browser bundle.
 */
export const FEES_AS_OF = "2026";

export type Exam = {
  id: string;
  name: string;
  board: string;
  feeNpr: number;
  feeNote: string;
  resultsIn: string;
  site: string;
};

export const EXAMS: Exam[] = [
  {
    id: "ielts-cd", name: "IELTS Academic — computer delivered", board: "British Council / IDP",
    feeNpr: 33000, feeNote: "Published fee for computer-delivered IELTS in Nepal.",
    resultsIn: "Usually 3 to 5 days", site: "https://ielts.idp.com/nepal",
  },
  {
    id: "ielts-paper", name: "IELTS Academic — paper based", board: "British Council / IDP",
    feeNpr: 36200, feeNote: "Published fee for paper-based IELTS in Nepal.",
    resultsIn: "Around 13 days", site: "https://ielts.idp.com/nepal",
  },
  {
    id: "ielts-ukvi", name: "IELTS for UKVI", board: "British Council / IDP",
    feeNpr: 36200, feeNote: "Required for some UK routes. Check your course actually needs it before paying more.",
    resultsIn: "3 to 13 days depending on format", site: "https://ielts.idp.com/nepal",
  },
  {
    id: "pte", name: "PTE Academic", board: "Pearson",
    feeNpr: 32800, feeNote: "Priced in USD (about USD 220), so the rupee figure moves with the exchange rate.",
    resultsIn: "Usually within 2 days", site: "https://www.pearsonpte.com",
  },
];

export const examById = (id: string) => EXAMS.find((e) => e.id === id);

export const CENTRES: Array<{ city: string; ielts: boolean; pte: boolean; note?: string }> = [
  { city: "Kathmandu", ielts: true, pte: true, note: "The most venues and the most dates — Lainchaur, Battisputali and Tripureshwor among them." },
  { city: "Lalitpur", ielts: false, pte: true },
  { city: "Pokhara", ielts: true, pte: true },
  { city: "Chitwan / Bharatpur", ielts: true, pte: true },
  { city: "Butwal / Tilottama", ielts: true, pte: true },
  { city: "Itahari", ielts: true, pte: true },
  { city: "Biratnagar", ielts: true, pte: false },
  { city: "Birtamode", ielts: true, pte: false },
  { city: "Banepa", ielts: true, pte: false },
  { city: "Ghorahi", ielts: true, pte: false },
  { city: "Nepalgunj", ielts: true, pte: false },
];

export const citiesFor = (examId: string) =>
  CENTRES.filter((c) => (examId.startsWith("ielts") ? c.ielts : c.pte));

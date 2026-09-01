import type { AiProvider, AiResult, AiTask } from "@/lib/ai/types";
import { estimateCost, roughTokens } from "@/lib/ai/pricing";

/**
 * Built-in sample answers.
 *
 * This is not a toy: it lets the entire product be clicked through, demoed to a
 * consultancy owner, and screenshotted with no AI account, no key and no
 * internet. Every screen you see running on sample mode looks and behaves
 * exactly as it will on the real thing — only the words are canned.
 */

const SAMPLE: Record<string, unknown> = {
  "sop.draft": {
    sections: [
      {
        heading: "Why this course",
        body: "My decision to pursue a Master of Information Technology is not a recent one. During my BSc CSIT at Tribhuvan University I spent two semesters building a patient-records system for a community clinic in Chitwan, and the part that defeated us was not the code — it was securing data across unreliable connections. That problem is the reason I am applying, and it is the reason this specific programme, with its cybersecurity and cloud infrastructure stream, is the right one.",
      },
      {
        heading: "Academic background",
        body: "I completed my BSc CSIT in 2024 with a CGPA of 3.42, ranked in the upper third of a cohort of ninety-six. My strongest results were in Database Management Systems and Computer Networks. The gap year that followed was not idle: I worked as a junior support engineer at a Kathmandu ISP, where I handled routing escalations for business customers.",
      },
      {
        heading: "Why this university and this country",
        body: "I looked closely at three institutions before choosing this one. What decided it was the industry placement semester and the specific research of the faculty in the network security group, whose published work on low-bandwidth authentication is directly relevant to the problem I described above.",
      },
      {
        heading: "Financial arrangement",
        body: "My studies are funded by my father, who runs a registered construction supply business with an annual declared income of NPR 4,200,000, supported by three years of tax clearance and audited statements. We have arranged an education loan of NPR 3,500,000 against family land in Bharatpur, valued at NPR 11,000,000.",
      },
      {
        heading: "Career plan and return to Nepal",
        body: "Nepal's banking and telecom sectors are being pushed into serious security compliance for the first time, and there are very few people here who have worked with the standards this degree teaches. I intend to return and join that work — my former employer has already indicated an interest in a senior network security role.",
      },
    ],
    warnings: [
      {
        severity: "critical",
        title: "This draft is not ready to submit",
        detail:
          "A visa officer reads hundreds of these. Text written by a machine, however good, tends to share a rhythm and vocabulary that experienced readers recognise. Rewrite every paragraph in your own words and your own voice before this goes anywhere.",
      },
      {
        severity: "critical",
        title: "Every fact here is a placeholder",
        detail:
          "Figures, dates, employers and family details were generated from your profile and may not be accurate. Submitting an unverified financial figure is the single fastest route to a refusal, and in some cases to a fraud finding.",
      },
      {
        severity: "warning",
        title: "Universities screen for AI-written text",
        detail:
          "Many admissions offices now run statements through detection tools. A flagged statement can be treated as academic misconduct before you have even enrolled.",
      },
      {
        severity: "warning",
        title: "Your own specifics are what earn the place",
        detail:
          "The clinic project, the routing escalations, the named faculty member — those are the lines that work. Replace anything generic with something only you could have written.",
      },
    ],
  },

  "sop.review": {
    overall: 62,
    criteria: [
      { key: "course_fit", label: "Course rationale", score: 7, comment: "The link between your support-engineer work and the security stream is clear and credible. Name two specific units to make it stronger." },
      { key: "specificity", label: "Specific detail", score: 5, comment: "Paragraphs two and four could belong to any applicant. Anything true of ten thousand students is costing you space." },
      { key: "finances", label: "Financial clarity", score: 4, comment: "You state that your father will fund the course but never state his income, the loan amount, or the total cost you are covering. An officer cannot verify a claim you have not made." },
      { key: "ties", label: "Ties to Nepal", score: 6, comment: "The intention to return is asserted rather than evidenced. Name the sector, the kind of employer, and what you would be qualified to do." },
      { key: "language", label: "Language and structure", score: 8, comment: "Clean and readable. Two long sentences in the final paragraph would be better as four." },
    ],
    findings: [
      { severity: "critical", title: "Funding is unquantified", detail: "There is no figure anywhere in this statement. State the total cost, the sponsor's annual income, the loan amount and the source of savings.", quote: "My father will bear all my expenses during my studies." },
      { severity: "critical", title: "Study gap is unexplained", detail: "Your profile shows a one-year gap after your bachelors. The statement does not mention it. An unexplained gap is read as something being hidden.", quote: "" },
      { severity: "warning", title: "Course choice reads as second-hand", detail: "The reason given for this university applies equally to every university in the country. Cite something only this institution offers.", quote: "The university has an excellent reputation and world-class facilities." },
      { severity: "warning", title: "Return plan is generic", detail: "\"Serve my country\" appears in a large share of refused applications. Replace with a named sector, role and reason.", quote: "I want to come back and serve my country with the knowledge I gain." },
      { severity: "note", title: "Opening is slow", detail: "The first two sentences are throat-clearing. Start at the clinic project." , quote: "" },
    ],
    integrity: {
      aiLikelihood: 34,
      clicheCount: 6,
      notes: [
        "Phrases such as \"world-class facilities\" and \"serve my country\" appear in a very large share of statements from Nepal and read as template text.",
        "Sentence length is unusually uniform through the middle section, which is a common signature of generated text.",
        "The clinic paragraph reads as genuinely yours. Write the rest the way you wrote that.",
      ],
    },
  },

  "blog.draft": {
    title: "Cost of living in Australia for a Nepali student",
    description: "What a month in Sydney, Melbourne, Adelaide or Wollongong actually costs a Nepali student in rupees — and why the figure the embassy asks you to show is not the figure you will spend.",
    question: "How much does it cost to live in Australia as a student?",
    category: "Money",
    readMinutes: 7,
    blocks: [
      { type: "p", text: "There are two numbers, and confusing them is the most expensive mistake in this whole process. One is the amount the Department of Home Affairs requires you to demonstrate. The other is what your life will actually cost each month. They are not the same and neither one predicts the other." },
      { type: "h2", text: "The number you must show" },
      { type: "p", text: "For a student visa you demonstrate twelve months of living costs at the published figure, plus twelve months of tuition and return travel. That figure is set nationally and does not change between Sydney and Wollongong, which is precisely why it is a poor guide to your budget." },
      { type: "h2", text: "The number you will spend" },
      { type: "p", text: "Rent is the whole story. A shared room far from the centre in a regional city bears no resemblance to a studio in inner Sydney, and the gap between them is larger than every other line in your budget combined." },
      { type: "table", head: ["Line", "Frugal, shared", "Comfortable"], rows: [
        ["Rent, shared room", "Lower in regional cities", "Substantially higher in Sydney and Melbourne"],
        ["Food, cooking at home", "Modest", "Doubles if you eat out"],
        ["Transport", "Concession fares where eligible", "Higher without a concession"],
        ["Phone and internet", "Small", "Small"],
      ] },
      { type: "warn", title: "Do not budget on part-time work", text: "Visa hours are capped during term, the first two months usually produce no income at all while you find something, and no visa officer will accept expected earnings as part of your funding." },
      { type: "tool", href: "/tools/cost", label: "Put your own numbers in", text: "The cost calculator gives you the whole course in rupees and, separately, the balance the embassy asks to see." },
      { type: "h2", text: "What this means for your plan" },
      { type: "steps", items: [
        "Work out the amount you must show first, because it decides whether the application is possible at all.",
        "Then budget your actual monthly spending by the city you are going to, not the national average.",
        "Then check the gap against what the family can raise, and size the loan against that rather than guessing.",
      ] },
      { type: "note", title: "Confirm the figures", text: "Living-cost thresholds are set by the destination and change. Check the current requirement on the official immigration site before you commit money." },
    ],
  },

  "documents.check": {
    readiness: 58,
    summary: "The academic side of this file is complete and would pass a first look. The financial side is where it falls down: three of the documents a post will want are absent, and the one figure you have claimed is not yet supported by anything. Fix the finances and this becomes submittable.",
    missing: [
      { kind: "tax_clearance", label: "Sponsor tax clearance", severity: "critical", why: "You have stated a sponsor income of NPR 42 lakh with nothing to support it. An unsupported income figure is one of the most common refusal reasons for Nepali applicants." },
      { kind: "bank_balance", label: "Bank balance certificate", severity: "critical", why: "No proof of funds at all. Most posts also want the balance to have been held for a minimum period, so a certificate dated the week of submission raises its own questions." },
      { kind: "relationship", label: "Relationship certificate", severity: "warning", why: "Your sponsor is your father, and the ward office certificate is what proves that. Cheap to get and routinely asked for." },
      { kind: "recommendation", label: "Recommendation letters", severity: "note", why: "Not needed until you apply, but they take the longest to collect. Start asking now." },
    ],
    issues: [
      { kind: "english_test", severity: "critical", issue: "Your profile claims IELTS 6.5 overall, but no Test Report Form has been uploaded. Either upload it or remove the claim — a claimed score that cannot be produced is worse than no score." },
      { kind: "profile", severity: "warning", issue: "There is a one-year study gap after your bachelors and no experience letter covering that period. If you were working, get the letter; if you were not, be ready to explain it." },
      { kind: "passport", severity: "note", issue: "Check the expiry date covers your whole course plus six months. Renewing mid-application costs weeks." },
    ],
  },

  "mock.score_writing": {
    band: 6,
    criteria: [
      { key: "task", label: "Task Response", band: 5, comment: "You answered the causes half of the question in detail and gave the measures half two sentences. A two-part question answered in one part is capped at band 5 here, whatever the quality of the writing." },
      { key: "coherence", label: "Coherence and Cohesion", band: 6, comment: "Paragraphs are logical, but almost every link is \"Moreover\" or \"In addition\". Vary them and use referencing instead of repeating nouns." },
      { key: "lexis", label: "Lexical Resource", band: 6, comment: "Adequate range with some good collocation (\"skilled labour shortage\"). Repetition of \"opportunity\" five times is holding this down." },
      { key: "grammar", label: "Grammatical Range and Accuracy", band: 6, comment: "You attempt complex sentences, which is right, but article errors appear in most of them." },
    ],
    annotations: [
      { quote: "Many student go abroad for the better opportunity.", issue: "Plural agreement and an unnecessary definite article.", fix: "Many students go abroad for better opportunities." },
      { quote: "Government should provide facilities to attract them back.", issue: "Vague, and this is exactly the sentence that caps Task Response. Which facilities? For whom?", fix: "Governments could guarantee salary parity for returning graduates in shortage professions such as medicine and civil engineering." },
      { quote: "In addition, moreover, there are also other reasons.", issue: "Three linking devices in one sentence, adding nothing.", fix: "A second factor is the wage gap." },
    ],
    summary: "This reads like a band 6.5 essay that lost marks on structure rather than on English. Your sentences are more capable than your planning. Give the measures half its own two paragraphs and this moves to 6.5 without improving a single sentence.",
    fixFirst: [
      "Answer both halves of the question with roughly equal space. This is worth a full band on its own.",
      "Replace vague policy nouns (\"facilities\", \"opportunities\") with a named, concrete measure.",
    ],
  },

  "mock.score_speaking": {
    band: 6,
    criteria: [
      { key: "fluency", label: "Fluency and Coherence", band: 6, comment: "Part 2 ran to about 50 seconds of content where 90 is expected, and you covered three of the four bullet points. Length of turn is the single biggest thing holding this down." },
      { key: "lexis", label: "Lexical Resource", band: 6, comment: "You paraphrase adequately but reach for \"very good\" and \"a lot of\" when a precise word exists. \"Substantial\", \"considerable\", \"marked\" are all available to you." },
      { key: "grammar", label: "Grammatical Range and Accuracy", band: 6, comment: "Simple and compound sentences are accurate. Conditionals in Part 3 broke down twice, which is where band 7 is usually won." },
      { key: "pronunciation", label: "Pronunciation", band: 0, comment: "Not assessed. This was a typed test, so there was no audio to judge. Take this test again in voice mode once it arrives to get a pronunciation band." },
    ],
    summary: "A solid band 6 with band 7 grammar appearing in patches. The gap is not vocabulary or accuracy — it is that you stop talking too early. Examiners cannot award marks for what you did not say.",
    perAnswer: [
      { idx: 1, note: "Answered in one line. Part 1 answers should run two or three sentences with a reason attached." },
      { idx: 4, note: "The long turn: good content on how you learned the skill, but you never addressed why you did not expect it to be useful." },
      { idx: 5, note: "Your strongest answer. You conceded a point and then disagreed, which is exactly the band 7 move." },
    ],
    fixFirst: [
      "Practise Part 2 with a timer until you can speak for a full 90 seconds without stopping.",
      "Drill second and third conditionals — they are what Part 3 keeps asking for.",
    ],
  },

  "mock.report": {
    summary: "You are sitting at an overall band 6, and the pattern is consistent: your receptive skills are ahead of your productive ones. Reading and Listening are close to what most masters courses want. Writing and Speaking are the two that will keep you out, and both are losing marks for structural reasons rather than for English ability — which is good news, because structure is faster to fix than language.",
    strengths: [
      "Reading is your strongest skill and needs maintenance, not work.",
      "You attempt complex grammar rather than playing safe, which is what band 7 requires.",
      "Your listening gap-fill accuracy was high; the marks you lost were on distractors, not on comprehension.",
    ],
    drills: [
      { skill: "Writing", title: "Overviews only, seven days", detail: "Write only the overview sentence for ten different Task 1 charts a day. No body paragraphs. This is the cheapest band you will ever buy." },
      { skill: "Writing", title: "Split every question in half", detail: "Before writing, write the two halves of the question as two headings and plan a paragraph under each. Your Task Response cap disappears." },
      { skill: "Speaking", title: "90 seconds, no stopping", detail: "Record yourself on Part 2 cue cards daily. Stop only when the timer hits 90. Cover all four bullets every time." },
      { skill: "Listening", title: "Distractor hunting", detail: "Re-listen to Section 1 and write down every point where the speaker corrects or changes a detail. That is where your four lost marks were." },
    ],
  },

  "interview.next_question": {
    question: "Your sponsor is your father. What exactly does his business do, and what did he earn from it last year?",
    intent: "Testing whether the funding story is real and whether the student actually knows their own financial documents.",
    isFollowup: false,
  },

  "interview.evaluate_answer": {
    score: 5,
    verdict: "Believable but thin. An officer would push further on this.",
    strengths: ["You answered directly rather than talking around the question.", "You named the business type."],
    weaknesses: [
      "You gave no figure. Not knowing your own sponsor's income is read as a rehearsed application rather than a real one.",
      "You said \"good income\" — that phrase gives the officer nothing and invites a follow-up you may not want.",
    ],
    redFlags: ["Sponsor income not quantified"],
    modelAnswer:
      "My father runs a construction supply business in Bharatpur, registered since 2011. Last financial year he declared NPR 4.2 million, and I have the tax clearance and audited statements with me. Together with an education loan of NPR 3.5 million against our land, that covers my first-year tuition of AUD 34,000 and living costs.",
  },

  "interview.report": {
    overall: 58,
    readiness: "nearly",
    verdict:
      "You would probably not be refused on the strength of these answers alone, but two areas are weak enough that a thorough officer would keep pushing until something broke. Fix the finances and the return plan and this becomes a strong interview.",
    strengths: [
      "Course knowledge is genuinely good — you could name units and explain why they matter.",
      "You stayed calm on the follow-up questions rather than changing your story.",
      "Your account of your work experience was specific and checkable.",
    ],
    risks: [
      { severity: "critical", title: "You cannot quote your own funding figures", detail: "Three separate answers avoided a number. Learn the total cost, your sponsor's declared income, the loan amount and the bank balance, and be able to say them without hesitating." },
      { severity: "warning", title: "Return-to-Nepal answer sounds rehearsed", detail: "The phrasing was almost identical each time it came up. Officers notice repetition of a memorised line. Know the substance and say it differently each time." },
      { severity: "note", title: "You over-explained twice", detail: "Both times you volunteered information that was not asked for, which opened new lines of questioning. Answer the question, then stop." },
    ],
    nextSteps: [
      "Write down the four financial figures and rehearse them until they are automatic.",
      "Rebuild your return plan around one named sector and one named employer type.",
      "Run this interview again in two days and compare the funding score.",
    ],
  },
};

export const sampleProvider: AiProvider = {
  id: "sample",
  label: "Sample answers (offline)",
  async health() {
    return { ok: true, detail: "Built in. No account, no key, no cost." };
  },
  async complete(task: AiTask): Promise<AiResult> {
    const started = Date.now();
    const payload = SAMPLE[task.action];
    const text =
      payload !== undefined
        ? JSON.stringify(payload)
        : JSON.stringify({ note: `No sample answer stored for "${task.action}".` });
    // A small pause so loading states are visible while demoing.
    await new Promise((r) => setTimeout(r, 350));
    const inTok = roughTokens(task.system + task.prompt);
    const outTok = roughTokens(text);
    return {
      text,
      provider: "sample",
      model: "sample",
      inputTokens: inTok,
      outputTokens: outTok,
      // Costed as if it had run on the real model, so the meter stays honest.
      estCostUsd: estimateCost("claude-sonnet-5", inTok, outTok),
      ms: Date.now() - started,
    };
  },
};

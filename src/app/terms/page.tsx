import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { PLANS } from "@/lib/plans";
import { LegalPage, Row, type Section } from "../legal-page";

export const metadata = {
  title: "Terms, Stride",
  description: "What Stride agrees to do, what we ask of you, and what happens if either of us stops.",
};

/**
 * The terms of service.
 *
 * The test applied to every clause: would a consultancy owner reading this in
 * their second language understand what they are agreeing to, and would we be
 * comfortable being held to it? Anything that failed either half was cut or
 * rewritten. There are no clauses here that exist only to make us look
 * protected.
 */
export default function TermsPage() {
  const npr = (n: number) => `NPR ${n.toLocaleString("en-IN")}`;

  const sections: Section[] = [
    {
      id: "agreement",
      title: "What this is",
      body: (
        <>
          <p>
            This is the agreement between {LEGAL.entity}, of {LEGAL.place}, and the consultancy that
            opens an account. Using {BRAND.name} means accepting it. If you are accepting it for a
            consultancy, you are saying you are allowed to.
          </p>
          <p>
            Students and parents reach {BRAND.name} through the consultancy advising them. Their
            account is opened by that consultancy, and these terms apply to them too, in the parts
            that concern them.
          </p>
        </>
      ),
    },
    {
      id: "account",
      title: "Opening an account",
      body: (
        <>
          <p>
            An account is opened with a working email address, and your address on {BRAND.domain}{" "}
            comes from it. A consultancy with its own domain gets that name. A consultancy running
            on a free mailbox picks a name instead.
          </p>
          <p>
            One person, one login. Sharing a login between a desk defeats every record in the
            product: the trail of who did what becomes worthless, and so does anything built on it.
            Staff accounts are unlimited on every plan, so there is no reason to share one.
          </p>
          <p>
            You are responsible for what happens under your logins. Tell us at{" "}
            {LEGAL.contact.security} if you think one has been taken, and switch the account off
            from your own Staff screen, which ends its sessions immediately.
          </p>
        </>
      ),
    },
    {
      id: "plans",
      title: "Plans, limits and credits",
      body: (
        <>
          <p>
            You can set up and use {BRAND.name} before paying anything. There is no card on file
            and nothing is charged until you ask to be invoiced, which is also why there is nothing
            to cancel if you decide it is not for you.
          </p>
          <div className="mt-1">
            <Row label={`${PLANS.starter.label}, ${npr(PLANS.starter.priceNpr)} a month`}>
              {PLANS.starter.maxStudents} active students and one office.
            </Row>
            <Row label={`${PLANS.growth.label}, ${npr(PLANS.growth.priceNpr)} a month`}>
              {PLANS.growth.maxStudents} active students and up to {PLANS.growth.maxBranches}{" "}
              offices, with payroll, market research, and partners and commission.
            </Row>
            <Row label={`${PLANS.pro.label}, ${npr(PLANS.pro.priceNpr)} a month`}>
              Unlimited students and offices, and everything in {PLANS.growth.label}.
            </Row>
          </div>
          <p>
            <strong className="text-ink">Active students are what count.</strong> A student who has
            departed or been marked lost does not use a place. Passing the limit does not break
            anything and deletes nothing: adding the next student asks you to move up.
          </p>
          <p>
            <strong className="text-ink">AI credits</strong> are included monthly with each plan and
            are spent by the practice tools. When they run out those tools pause until the first of
            the month. The board, documents, attendance, payroll and reports do not use credits and
            keep working.
          </p>
        </>
      ),
    },
    {
      id: "paying",
      title: "Paying",
      body: (
        <>
          <p>
            Invoices are raised in Nepali rupees, monthly, from the day you ask to be invoiced.
            There is no card on file and no automatic charge: an invoice arrives, and you pay it.
            The other currencies shown on our pricing page are there so a partner or an investor can
            read it without doing arithmetic; they are not what you are billed in.
          </p>
          <p>
            Moving up takes effect at once and is charged for the rest of that month. Moving down
            takes effect at the end of the month you have paid for, and nothing you have already
            entered is deleted by moving down, although features above your new plan stop being
            available.
          </p>
          <p>
            If an invoice goes unpaid we will write to you before anything changes. After thirty
            days we may suspend the account, which means nobody can sign in. We will not delete
            your data for non-payment while you are still talking to us, and we will always let you
            export it.
          </p>
          <p>
            Prices can change. Existing customers get sixty days&rsquo; notice by email before a
            price change applies to them, and can leave before it does.
          </p>
        </>
      ),
    },
    {
      id: "your-data",
      title: "Your data stays yours",
      body: (
        <>
          <p>
            Everything you and your students put into {BRAND.name} belongs to you. We hold it to run
            the service and for nothing else. We do not sell it, we do not show anybody advertising
            against it, and we do not use it to train an AI model.
          </p>
          <p>
            Ask us and we send you a complete export of your own records, in a format you can open,
            within seven days. That holds while your account is open and for thirty days after it
            closes. A button in your console that does it without asking is being built; until it
            is there, an email does it. What happens to your data afterwards is set out in the{" "}
            <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
              privacy policy
            </Link>
            .
          </p>
          <p>
            We may use counts across all consultancies to understand how the product is used and to
            write about the market, for example how many enquiries convert nationally. Nothing in
            that identifies a consultancy, a student or a staff member.
          </p>
        </>
      ),
    },
    {
      id: "your-part",
      title: "What we ask of you",
      body: (
        <>
          <p>Four things, and none of them are unusual.</p>
          <div className="mt-1">
            <Row label="Have the right to the data">
              Tell your students what you record about them and get their agreement, including a
              parent&rsquo;s where the student is under eighteen. You are the one collecting it; we
              only hold it.
            </Row>
            <Row label="Keep your own licence in order">
              Running an education consultancy in Nepal has its own requirements. Meeting them is
              your business, not something using {BRAND.name} takes care of.
            </Row>
            <Row label="Use it for what it is">
              Not for sending unsolicited bulk messages, not for storing something unlawful, and not
              for reselling access without agreeing it with us first.
            </Row>
            <Row label="Leave other people's data alone">
              Do not try to reach another consultancy&rsquo;s records, work around the permission
              system, or take the product apart to copy it. Testing your own account&rsquo;s
              security is welcome; tell us what you find at {LEGAL.contact.security}.
            </Row>
          </div>
        </>
      ),
    },
    {
      id: "practice-tools",
      title: "What the practice tools are, and are not",
      body: (
        <>
          <p>
            The mock interview, the statement studio, the eligibility check and the calculators are
            practice. They are built to be realistic and they are sometimes wrong.
          </p>
          <p>
            Nothing in {BRAND.name} is immigration advice, legal advice or financial advice. No
            score here predicts a visa decision, an admission decision or a bank&rsquo;s decision:
            those are made by governments, universities and banks, on their own rules, and neither
            we nor your consultancy can promise an outcome. Check anything that matters against the
            official source, which the market pages link to for exactly that reason.
          </p>
        </>
      ),
    },
    {
      id: "running",
      title: "Keeping the service running",
      body: (
        <>
          <p>
            We will keep {BRAND.name} available and look after your data properly, and we will tell
            you honestly when something has gone wrong rather than waiting to be asked.
          </p>
          <p>
            We do not promise a particular uptime figure. Saying so plainly is more use to you than
            a number in a contract that would be paid out in service credits nobody wants. What we
            do commit to: planned work happens outside Nepali office hours wherever it can, you are
            told beforehand, and when something breaks unexpectedly we say what happened.
          </p>
          <p>
            Support is by email at {LEGAL.contact.general}. We answer within one working day. The
            product is built so that you should not need to write to us at all, and when you do
            need to, that is a fault in the product as much as a question from you.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "Changes to the product",
      body: (
        <>
          <p>
            {BRAND.name} changes constantly, mostly by adding things. If we ever remove something
            you rely on, or change how a plan works, you get sixty days&rsquo; notice by email and
            can leave inside that window with a refund of anything paid in advance.
          </p>
          <p>
            These terms can change too. The date at the top says when the current wording took
            effect, and a change that matters to you is emailed rather than quietly published.
          </p>
        </>
      ),
    },
    {
      id: "ending",
      title: "Ending it",
      body: (
        <>
          <p>
            You can close your account whenever you like, from your own console or by writing to us.
            There is no notice period and no cancellation fee. We refund the unused part of a month
            you have already paid for.
          </p>
          <p>
            We can suspend or close an account for an unpaid invoice after thirty days, or immediately for
            something serious: using {BRAND.name} to break the law, trying to reach another
            consultancy&rsquo;s data, or putting other customers&rsquo; data at risk. Except where
            the law stops us, we will tell you why, and we will let you export your data first.
          </p>
        </>
      ),
    },
    {
      id: "liability",
      title: "Where responsibility ends",
      body: (
        <>
          <p>
            We are responsible for running the service as described here and for looking after your
            data as described in the privacy policy. Where we fail at that, we are responsible for
            what follows, and nothing in these terms is meant to limit that in a case of our own
            fraud, or in any way the law does not permit.
          </p>
          <p>
            Beyond that, our total liability to you in any twelve month period is limited to what
            you paid us in that period. Where that is nothing, because you have not been invoiced
            yet, what we owe you is to fix the problem or to help you take your data elsewhere.
          </p>
          <p>
            We are not responsible for a visa refusal, an admission rejection, a missed intake or a
            deadline your office did not act on. {BRAND.name} shows you what is late; acting on it
            is the consultancy&rsquo;s work.
          </p>
        </>
      ),
    },
    {
      id: "law",
      title: "Which law applies",
      body: (
        <>
          <p>
            The law of Nepal, and the courts of Kathmandu. If something goes wrong between us, write
            to {LEGAL.contact.general} first: in the time it takes to instruct anybody, we would
            usually have fixed it.
          </p>
          <p>
            If any part of these terms turns out to be unenforceable, the rest of it still stands.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Terms"
      intro="What we agree to do, what we ask of you, and what happens if either of us stops. No clause here exists only to make us look protected."
      summary={[
        "Set up and use it before paying anything. No card on file, and nothing is charged until you ask to be invoiced.",
        "Your data is yours. Ask and we export all of it within seven days, and you can leave with no fee and no notice.",
        "Staff accounts are unlimited on every plan, so nobody needs to share a login.",
        "The practice tools are practice. Nothing here is immigration advice, and no score predicts a visa decision.",
        "Sixty days' notice by email before a price rises or something you rely on changes.",
      ]}
      sections={sections}
    />
  );
}

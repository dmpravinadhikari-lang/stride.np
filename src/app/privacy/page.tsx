import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { LegalPage, Row, type Section } from "../legal-page";

export const metadata = {
  title: "Privacy, OfficeYak",
  description: "What OfficeYak holds, who can reach it, and how to get it back or have it deleted.",
};

/**
 * The privacy policy.
 *
 * Written from what the software actually does rather than from a template:
 * every claim here is one somebody could check by reading the code or by
 * opening the Security screen in their own console. Where a thing is not done
 * yet, it says so instead of promising it.
 */
export default function PrivacyPage() {
  const sections: Section[] = [
    {
      id: "who",
      title: "Whose data this is",
      body: (
        <>
          <p>
            There are two relationships here and they are not the same, so it is worth being clear
            about which one applies to you.
          </p>
          <div className="mt-1">
            <Row label="A consultancy">
              You are our customer. You decide what goes into {BRAND.name}, who at your office may
              see it, and how long it stays. We hold it on your behalf and act on your instructions.
            </Row>
            <Row label="A student or a parent">
              Your relationship is with the consultancy advising you. They opened your file, they
              decide what is in it, and questions about it go to them first. We hold it for them,
              and we will help them answer you.
            </Row>
          </div>
          <p>
            In the language of Nepal&rsquo;s Individual Privacy Act, 2075, the consultancy is the
            one collecting and using personal information, and {BRAND.name} is the service they use
            to do it.
          </p>
        </>
      ),
    },
    {
      id: "what",
      title: "What we hold",
      body: (
        <>
          <p>Only what the product needs to do its job. In full:</p>
          <div className="mt-1">
            <Row label="Account details">
              Name, work email, mobile if given, the job somebody does at the consultancy, and a
              password stored only as a scrypt hash that cannot be read back.
            </Row>
            <Row label="Student records">
              Whatever the consultancy enters: contact details, destination and course, stage,
              notes, applications, test results, checklist progress.
            </Row>
            <Row label="Documents">
              The files a consultancy or a student uploads: passports, bank letters, transcripts,
              offer letters. These are encrypted before they reach the disk.
            </Row>
            <Row label="Attendance">
              Clock-in and clock-out times, and the point on the map at the moment the button was
              pressed. While the clock screen is open the browser is asked where the device is, so
              the check is ready when somebody presses the button. Nothing is recorded unless they
              press it, and there is no tracking of anybody between punches.
            </Row>
            <Row label="Practice work">
              Statements of purpose, mock interview answers and mock test attempts, with the
              scores, kept on the student&rsquo;s own file.
            </Row>
            <Row label="Records of what happened">
              Who changed a stage, verified a document, opened payroll, or changed somebody&rsquo;s
              permissions, with a name and a time. What was sent by email, to whom, and whether it
              was delivered.
            </Row>
            <Row label="Visits to the public pages">
              Counts only, and only on the marketing pages and free calculators. Never inside a
              consultancy&rsquo;s console, and never on a parent&rsquo;s progress page.
            </Row>
          </div>
          <p>
            We do not ask for, and have no use for, citizenship numbers, caste or ethnicity,
            political views, or health information. If a consultancy uploads a document containing
            something like that, it is treated like any other document: encrypted, restricted, and
            deleted when they delete it.
          </p>
        </>
      ),
    },
    {
      id: "why",
      title: "Why we hold it",
      body: (
        <>
          <p>
            To run the service the consultancy is paying for, and for nothing else. Concretely:
            showing a counsellor their own students, telling somebody what is late, sending the
            invitation a student is waiting for, producing the month&rsquo;s payroll, and proving
            afterwards who did what.
          </p>
          <p>
            We do not sell it. We do not share it with advertisers. We do not build a profile of a
            student across consultancies, and there is no product here that would be improved by
            doing so.
          </p>
        </>
      ),
    },
    {
      id: "ai",
      title: "The AI tools, specifically",
      body: (
        <>
          <p>
            When a consultancy has the practice tools switched on, the text a student writes in the
            tool they are using is sent to our AI provider to be answered or scored, along with the
            parts of their own profile that make the practice realistic, such as the country they
            are applying to and the course. Nothing else from their file goes with it: not their
            documents, not their fees, not their notes, not anything about another student.
          </p>
          <p>
            Their work is not used to train anybody&rsquo;s model, ours or the provider&rsquo;s. A
            consultancy that wants none of this can switch the tools off for the whole office, and
            then nothing is sent at all.
          </p>
        </>
      ),
    },
    {
      id: "who-sees",
      title: "Who can see it",
      body: (
        <>
          <p>
            Inside a consultancy, only the people their own owner has given the key to. Each person
            has a job, each job carries a set of permissions, and the server checks them on every
            screen rather than only hiding links. A consultancy can see exactly who holds which key
            on the Security page in their own console.
          </p>
          <p>
            One consultancy cannot see another. That is not a setting anybody can switch off: every
            query in the product is written against the consultancy asking it.
          </p>
          <p>
            At {LEGAL.entity}, access to customer data is limited to the people who keep the service
            running, is used only to fix something or to answer a request from the consultancy, and
            is recorded. We will not browse a consultancy&rsquo;s students out of interest.
          </p>
          <p>The outside services that touch data at all, and what each one gets:</p>
          <div className="mt-1">
            {LEGAL.processors.map((p) => (
              <Row key={p.name} label={`${p.name} (${p.country})`}>{p.what}</Row>
            ))}
          </div>
          <p>
            We will hand data to a government or a court only when we are legally required to, and
            we will tell the consultancy it concerns unless we are forbidden from doing so.
          </p>
        </>
      ),
    },
    {
      id: "where",
      title: "Where it is kept",
      body: (
        <>
          <p>
            On servers operated by {LEGAL.hosting.provider} in {LEGAL.hosting.country}. Backups are
            encrypted before they leave the machine, so a copy in transit or at rest somewhere else
            is unreadable without the key, which is not stored beside it.
          </p>
          <p>
            That means personal information about people in Nepal is held outside Nepal. A
            consultancy that needs it held inside the country should talk to us before signing up,
            because today we cannot offer that.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "How it is protected",
      body: (
        <>
          <p>
            Documents are encrypted with AES-256 before they touch the disk, under a key held apart
            from the data. Passwords are stored as scrypt hashes with a salt each, so nobody here
            can read one, including us. Sessions are signed, and changing a password ends every
            other one. Opening payroll or a student&rsquo;s document is written to a trail the
            product itself cannot delete.
          </p>
          <p>
            The full account of what protects your data, what we are doing next and what we will
            never do is on the{" "}
            <Link href="/#security" className="font-semibold text-brand-600 hover:underline">
              security section of our front page
            </Link>
            , and every consultancy sees the same facts about their own account on their Security
            screen.
          </p>
          <p>
            If you believe you have found a weakness, write to {LEGAL.contact.security}. We would
            rather hear it from you than from somebody else.
          </p>
        </>
      ),
    },
    {
      id: "keeping",
      title: "How long it is kept",
      body: (
        <>
          <div className="mt-1">
            <Row label="While you are a customer">
              As long as the consultancy keeps it. They control their own records and can delete a
              document or a file at any time.
            </Row>
            <Row label="Sensitive documents">
              Bank letters and income papers carry an expiry and are removed after the intake they
              were needed for, unless the consultancy marks one to keep.
            </Row>
            <Row label="After an account closes">
              Ask and we send you a complete export within seven days. Thirty days after closure we
              delete the data from the live system, and the encrypted backups holding it are
              removed within a further ninety days, which is how long any backup is kept.
            </Row>
            <Row label="The trail of who did what">
              Kept, because its value is that nobody can quietly remove a line from it. It records
              the act and never the contents.
            </Row>
          </div>
        </>
      ),
    },
    {
      id: "rights",
      title: "Your rights, and how to use them",
      body: (
        <>
          <p>
            Under Nepal&rsquo;s Individual Privacy Act, 2075, you can ask what is held about you,
            ask for it to be corrected, and ask for it to be deleted.
          </p>
          <p>
            <strong className="text-ink">If you are a student or a parent</strong>, ask the
            consultancy advising you. They hold the file and they can correct it, export it or
            delete it themselves, usually faster than we can. If they do not answer, write to{" "}
            {LEGAL.contact.privacy} and we will help.
          </p>
          <p>
            <strong className="text-ink">If you are a consultancy</strong>, most of this is a button
            in your own console. Anything it does not cover, write to {LEGAL.contact.privacy} and we
            will answer within seven days.
          </p>
          <p>
            Nobody has to pay to exercise any of this, and asking for it will never affect the
            service you get.
          </p>
        </>
      ),
    },
    {
      id: "students",
      title: "Students under eighteen",
      body: (
        <p>
          Some students are under eighteen when their file is opened. Their consultancy is
          responsible for having a parent&rsquo;s or guardian&rsquo;s agreement before entering
          their information, which is the same responsibility they already have on paper. The
          product supports this directly: a parent can be given a read-only view of their
          child&rsquo;s progress without being handed the whole file, and that access can be
          withdrawn at any time.
        </p>
      ),
    },
    {
      id: "cookies",
      title: "Cookies",
      body: (
        <>
          <p>Three, and none of them follow anybody around the internet.</p>
          <div className="mt-1">
            <Row label="Your session">
              Set when you sign in, so the next page knows it is still you. Signing out removes it.
            </Row>
            <Row label="A front desk tablet">
              Set once when an office enrols a device as its clock. It can do one thing, which is
              work that office&rsquo;s clock, and it is refused by every other screen.
            </Row>
            <Row label="Analytics, on the public pages only">
              Set by Google Analytics with the address shortened, to count visitors to the marketing
              pages and the free calculators. It is not set anywhere inside a console, and it is not
              set at all if we have not configured a measurement ID.
            </Row>
          </div>
        </>
      ),
    },
    {
      id: "changes",
      title: "Changes, and how to reach us",
      body: (
        <>
          <p>
            When this changes we will update the date at the top, and if the change actually matters
            to you we will email the consultancy rather than hoping somebody notices a new date.
          </p>
          <p>
            Write to {LEGAL.contact.privacy} about anything on this page, or{" "}
            {LEGAL.contact.general} about anything else. {LEGAL.entity} is run from {LEGAL.place}.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Privacy"
      intro="What OfficeYak holds, who can reach it, where it is kept, and how to get it back or have it deleted. Written to be read, not survived."
      summary={[
        "Your students' records belong to your consultancy. We hold them for you and act on your instructions.",
        "We do not sell data, show anybody advertising, or build a profile of a student across consultancies.",
        "Documents are encrypted before they touch the disk, and one consultancy cannot see another.",
        "Nothing a student writes in the practice tools is used to train any AI model.",
        "Ask and we export everything or delete it. It costs nothing, and it never affects your service.",
      ]}
      sections={sections}
    />
  );
}

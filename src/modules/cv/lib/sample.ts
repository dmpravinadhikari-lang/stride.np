import { parseCv, type Cv } from "./schema";

/**
 * A worked example, used only to fill the design previews.
 *
 * The previews have to show a real document. A thumbnail of an empty page is
 * five identical white rectangles, which is exactly the problem the previews
 * exist to solve. So before the student has typed anything they see this
 * instead, and the moment they have their own details the previews switch to
 * those.
 *
 * Deliberately obviously an example. It is never offered as a starting point
 * and never written into the form: a student who accidentally downloaded
 * Sunita's CV with their own name on it would be worse off than one who started
 * from nothing. It is a picture of a layout, not a template to fill in.
 */
export const sampleCv: Cv = parseCv({
  name: "Sunita Gurung",
  headline: "BPH graduate, two years in field research",
  email: "sunita.gurung@example.com",
  phone: "+977 9801234567",
  location: "Kathmandu, Nepal",
  summary:
    "Public health graduate from Tribhuvan University with two years collecting and analysing survey data across three districts. Applying for an MPH, and comfortable with the reporting that keeps a field team on schedule.",
  education: [
    {
      qualification: "Bachelor of Public Health",
      institution: "Institute of Medicine",
      board: "Tribhuvan University",
      start: "2019",
      end: "2023",
      grade: "3.42 CGPA",
      highlights: ["Thesis on maternal health service uptake in Kavre district"],
    },
    {
      qualification: "+2 Science",
      board: "National Examination Board",
      start: "2017",
      end: "2019",
      grade: "72.5%",
    },
  ],
  experience: [
    {
      role: "Field Research Assistant",
      organisation: "Nepal Health Research Council",
      start: "Jan 2024",
      end: "Present",
      highlights: [
        "Collected survey data from 320 households across three wards",
        "Trained six enumerators on the digital survey tool",
        "Cut the monthly reporting cycle from ten days to four",
      ],
    },
    {
      role: "Intern",
      organisation: "Patan Hospital",
      start: "Jun 2023",
      end: "Sep 2023",
      highlights: ["Supported the outpatient records department during a systems migration"],
    },
  ],
  skills: [
    { group: "Software", items: ["SPSS", "Excel", "KoBo Toolbox"] },
    { group: "Field", items: ["Household survey design", "Enumerator training"] },
  ],
  /* So the design picker shows the rated patterns doing the thing they are
     for, rather than an empty column where the dots would be. */
  skillLevels: {
    SPSS: 3,
    Excel: 4,
    "KoBo Toolbox": 4,
    "Household survey design": 4,
    "Enumerator training": 3,
  },
  tests: [{ name: "IELTS", score: "7.0", detail: "L7.5 R7.0 W6.5 S7.0", date: "Mar 2026" }],
  certifications: [{ title: "Good Clinical Practice", issuer: "NIH", year: "2023" }],
  volunteering: [
    {
      role: "Secretary",
      organisation: "Rotaract Club of Kathmandu",
      start: "2022",
      end: "2024",
      highlights: ["Organised a blood donation camp that collected 84 units"],
    },
  ],
  awards: [{ title: "Merit Scholarship", issuer: "Tribhuvan University", year: "2021" }],
  languages: [
    { language: "Nepali", level: "Native" },
    { language: "English", level: "Fluent" },
  ],
  projects: [
    {
      title: "District immunisation dashboard",
      context: "Final-year project",
      year: "2023",
      highlights: ["Built a coverage tracker in KoBo and Excel for four rural municipalities"],
    },
  ],
  publications: [
    {
      title: "Maternal health service uptake in Kavre district",
      venue: "Journal of Nepal Public Health Association",
      year: "2024",
    },
  ],
  referees: [
    {
      name: "Dr Bina Shrestha",
      role: "Associate Professor",
      organisation: "Institute of Medicine",
    },
  ],
});

/**
 * What the previews should draw: the student's own CV once it has anything in
 * it, the example until then.
 */
export function previewCv(cv: Cv): { cv: Cv; isSample: boolean } {
  const hasSomething =
    !!cv.name.trim() || cv.education.length > 0 || cv.experience.length > 0 || !!cv.summary.trim();
  return hasSomething ? { cv, isSample: false } : { cv: sampleCv, isSample: true };
}

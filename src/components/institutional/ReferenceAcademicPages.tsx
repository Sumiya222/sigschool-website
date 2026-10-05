import { Check, ArrowRight } from "lucide-react";

const ageEligibility = [
  "Preschool",
  "Prep / KG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
] as const;

const academicCalendars = [
  { id: "preschool-summer-2022-23", group: "Preschool", season: "Summer", year: "2022–23" },
  { id: "preschool-winter-2022-23", group: "Preschool", season: "Winter", year: "2022–23" },
  { id: "classes-1-4-summer-2022-23", group: "Classes 1–4", season: "Summer", year: "2022–23" },
  { id: "classes-1-4-winter-2022-23", group: "Classes 1–4", season: "Winter", year: "2022–23" },
  { id: "classes-5-10-summer-2022-23", group: "Classes 5–10", season: "Summer", year: "2022–23" },
  { id: "classes-5-10-winter-2022-23", group: "Classes 5–10", season: "Winter", year: "2022–23" },
] as const;

const assessmentTypes = [
  "Quizzes",
  "Class Assessments",
  "Assignments",
  "Monthly Assessments",
  "Mid-Term Examinations",
  "Final-Term Examinations",
  "Projects",
  "Presentations",
  "Practical Activities",
  "Class Participation",
  "Continuous Assessment",
  "Subject-Based Assessments",
] as const;

function Hero({
  eyebrow,
  title,
  subtitle,
  description,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <section className="ref-inner-hero">
      <div className="ref-inner-container">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
        <span>{description}</span>
      </div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <aside className="ref-notice">
      <b>Important information</b>
      <p>{children}</p>
    </aside>
  );
}

const admissionSteps = [
  [
    "Explore Signature School",
    "Learn about Signature School, our educational philosophy, academic pathways, digital-first learning, student life, learning environment and parent partnership.",
  ],
  [
    "Select Your Campus",
    "Campus, city, area, grades, contact details and facilities will appear after official campus information is provided.",
  ],
  [
    "Submit Online Application",
    "Complete student, parent/guardian, previous-school, grade, contact, campus and document information.",
  ],
  [
    "Application Review",
    "Application Submitted → Document Review → Eligibility Verification → Application Status",
  ],
  [
    "Student Assessment / Interaction",
    "Assessment or interaction requirements may vary by grade and campus.",
  ],
  [
    "Admission Decision",
    "Application Under Review · Additional Information Required · Admission Offered · Further Action Required",
  ],
  [
    "Enrollment",
    "Submit final documents, complete admission formalities, confirm enrollment, receive school information and prepare for the academic year.",
  ],
  ["Welcome to Signature School", "Your child’s learning journey begins here."],
] as const;

export function AdmissionProcedurePage() {
  return (
    <main className="reference-inner-page">
      <Hero
        eyebrow="Admissions"
        title="Admission Procedure"
        subtitle="Your Journey to Signature School"
        description="From discovering Signature School to becoming part of our learning community, our admission process is designed to be clear, simple and supportive for families."
      />
      <section className="ref-inner-section">
        <div className="ref-inner-container ref-timeline">
          {admissionSteps.map(([title, body], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
                {title === "Explore Signature School" && (
                  <a href="/about">
                    Explore Signature School <ArrowRight />
                  </a>
                )}
                {title === "Submit Online Application" && (
                  <a href="/apply-online">
                    Apply Online <ArrowRight />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="ref-inner-section ref-soft">
        <div className="ref-inner-container">
          <p className="ref-inner-eyebrow">Placement guidance</p>
          <h2>Age Eligibility by Class</h2>
          <p className="ref-lead">
            Age requirements help ensure that students are placed in an appropriate learning
            environment for their developmental and academic stage.
          </p>
          <div className="ref-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Minimum Age</th>
                  <th>Maximum Age</th>
                </tr>
              </thead>
              <tbody>
                {ageEligibility.map((name) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>[To Be Provided]</td>
                    <td>[To Be Provided]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notice>
            Official Signature School age limits have not yet been provided. These markers must be
            replaced only with approved information.
          </Notice>
        </div>
      </section>
    </main>
  );
}

const pathways = [
  [
    "Early Years / Preschool",
    [
      "Early literacy",
      "Numeracy",
      "Communication",
      "Creativity",
      "Social development",
      "Motor skills",
      "Exploration",
      "Digital awareness",
    ],
  ],
  [
    "Primary",
    [
      "English",
      "Mathematics",
      "Science",
      "Social Studies",
      "Languages",
      "Digital literacy",
      "Creative expression",
      "Collaboration",
    ],
  ],
  [
    "Middle School",
    [
      "Conceptual understanding",
      "Critical thinking",
      "Computing",
      "Technology",
      "Projects",
      "Communication",
      "Leadership",
      "Problem solving",
    ],
  ],
  [
    "Secondary",
    [
      "Academic specialization",
      "Examination preparation",
      "Independent learning",
      "Career awareness",
      "Research",
      "Leadership",
      "Future pathways",
    ],
  ],
] as const;

export function AcademicsPage() {
  return (
    <main className="reference-inner-page">
      <Hero
        eyebrow="Academics"
        title="Academics"
        subtitle="Building Strong Foundations for a Future-Ready Generation"
        description="Signature School combines strong academic foundations with digital learning, practical skills, creativity, critical thinking and collaborative learning."
      />
      <section className="ref-inner-section">
        <div className="ref-inner-container ref-pathways">
          {pathways.map(([title, items]) => (
            <article key={title}>
              <span>✦</span>
              <h2>{title}</h2>
              <ul>
                {items.map((item) => (
                  <li key={item}>
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="ref-inner-section ref-soft">
        <div className="ref-inner-container">
          <p className="ref-inner-eyebrow">Academic calendars</p>
          <h2>Explore Academic Years & Seasonal Learning Calendars</h2>
          <p className="ref-lead">
            A configurable collection of calendar books for academic groups and years.
          </p>
          <div className="ref-books">
            {academicCalendars.map((book, index) => (
              <a
                href={`/academics/calendar/${book.id}`}
                className={`book-${index % 3}`}
                key={book.id}
              >
                <span>
                  Signature
                  <br />
                  School
                </span>
                <b>{book.group}</b>
                <i>{book.season}</i>
                <small>{book.year}</small>
                <em>Open calendar →</em>
              </a>
            ))}
          </div>
          <Notice>
            The calendar year and seasonal structure are configurable. Official dates are added only
            after Signature School approval.
          </Notice>
        </div>
      </section>
    </main>
  );
}

const process = [
  "Learning",
  "Class Activities",
  "Quizzes",
  "Assignments",
  "Monthly Assessments",
  "Mid-Term Assessment",
  "Continuous Progress Monitoring",
  "Final-Term Examination",
  "Result Compilation",
  "Progress Review",
];

export function ExaminationsPage() {
  const terms = [
    [
      "Term 1",
      [
        "Continuous assessment",
        "Quizzes",
        "Assignments",
        "Monthly assessments",
        "Mid-term assessment/examination",
        "Term-end assessment",
        "Result compilation",
      ],
    ],
    [
      "Term 2",
      [
        "Continuous assessment",
        "Quizzes",
        "Assignments",
        "Monthly assessments",
        "Mid-term assessment/examination",
        "Final-term examination",
        "Result compilation",
      ],
    ],
  ] as const;
  return (
    <main className="reference-inner-page">
      <Hero
        eyebrow="Academics"
        title="Examinations & Assessment"
        subtitle="Measuring Progress. Supporting Growth."
        description="Signature School uses continuous assessment and structured examinations to understand student progress, identify learning needs and support academic development."
      />
      <section className="ref-inner-section">
        <div className="ref-inner-container">
          <div className="ref-assessments">
            {assessmentTypes.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item}</h3>
                <p>
                  {item === "Quizzes"
                    ? "Short assessments used to check understanding of concepts."
                    : "A configurable part of a holistic progress-support system."}
                </p>
              </article>
            ))}
          </div>
          <Notice>
            Assessment approaches may vary by grade. Confirm the approved Signature School policy
            before publishing grade-specific requirements.
          </Notice>
        </div>
      </section>
      <section className="ref-inner-section ref-soft">
        <div className="ref-inner-container">
          <p className="ref-inner-eyebrow">Two-term structure</p>
          <h2>Academic Examination Structure</h2>
          <div className="ref-terms">
            {terms.map(([title, items]) => (
              <article key={title}>
                <h3>{title}</h3>
                <ul>
                  {items.map((item) => (
                    <li key={item}>
                      <Check />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="ref-inner-section">
        <div className="ref-inner-container">
          <p className="ref-inner-eyebrow">Progress process</p>
          <h2>From learning to review</h2>
          <div className="ref-process">
            {process.map((item, index) => (
              <span key={item}>
                <b>{index + 1}</b>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function CalendarPage({ id }: { id: string }) {
  const calendar = academicCalendars.find((item) => item.id === id) ?? academicCalendars[0];
  const items = [
    "Academic Year",
    "Term dates",
    "School opening date",
    "School closing date",
    "Teaching periods",
    "Assessment periods",
    "Examination dates",
    "Holidays",
    "Parent meetings",
    "Student activities",
    "Important events",
    "Breaks",
    "Result dates",
  ];
  return (
    <main className="reference-inner-page">
      <Hero
        eyebrow="Academic Calendar"
        title={`${calendar.group} — ${calendar.season}`}
        subtitle={`Academic Year ${calendar.year}`}
        description="Official calendar dates will appear here once verified and published by Signature School."
      />
      <section className="ref-inner-section">
        <div className="ref-inner-container">
          <div className="ref-assessments">
            {items.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item}</h3>
                <p>[Date to be Provided]</p>
              </article>
            ))}
          </div>
          <Notice>
            This is a configurable calendar detail page. Replace placeholders only with officially
            approved dates.
          </Notice>
        </div>
      </section>
    </main>
  );
}

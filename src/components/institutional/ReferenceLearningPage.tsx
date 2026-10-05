const pages = {
  "/learn-to-earn": {
    eyebrow: "Signature Learning",
    title: "Learn to Earn",
    subtitle: "From learning to opportunity",
    description:
      "Signature School connects knowledge with practical skills, digital fluency, creativity and the confidence to create meaningful futures.",
    flow: ["Learning", "Practice", "Create", "Lead", "Earn"],
    cards: [
      "Practical skills",
      "Digital skills",
      "Creativity",
      "Problem solving",
      "Entrepreneurship",
      "Communication",
      "Leadership",
      "Innovation",
    ],
  },
  "/digital-learning": {
    eyebrow: "Digital Learning",
    title: "A Smarter Way to Learn",
    subtitle: "Connected learning for every learner",
    description:
      "Digital tools support engaged learning, clearer progress visibility and purposeful teaching resources.",
    cards: [
      "Digital library",
      "Digital assignments",
      "Digital assessment",
      "Progress tracking",
      "Parent visibility",
      "Student learning resources",
      "Teacher resources",
      "Analytics",
    ],
  },
  "/steam": {
    eyebrow: "Innovation",
    title: "STEAM & Innovation",
    subtitle: "Ideas become discoveries",
    description:
      "Learning across Science, Technology, Engineering, Arts and Mathematics encourages curiosity, collaboration and real-world problem solving.",
    cards: [
      "Experiments",
      "Robotics",
      "Coding",
      "Design challenges",
      "Science projects",
      "Innovation competitions",
      "Research projects",
      "Problem solving",
      "Creativity",
      "Collaboration",
    ],
  },
  "/leadership": {
    eyebrow: "Student Growth",
    title: "Leadership",
    subtitle: "Confident voices. Meaningful action.",
    description:
      "Leadership experiences help learners communicate, collaborate and contribute with purpose.",
    cards: [
      "Communication",
      "Public speaking",
      "Teamwork",
      "Decision-making",
      "Problem-solving",
      "Entrepreneurship",
      "Community service",
      "Innovation",
      "Student councils",
      "Clubs",
      "Competitions",
      "Community projects",
    ],
  },
  "/student-wellbeing": {
    eyebrow: "Student Wellbeing",
    title: "Every learner belongs.",
    subtitle: "A caring, respectful learning community",
    description:
      "Student wellbeing is supported through safe learning environments, positive relationships, inclusion and parent communication.",
    cards: [
      "Safe learning environment",
      "Student support",
      "Anti-bullying",
      "Emotional wellbeing",
      "Positive relationships",
      "Respect",
      "Inclusion",
      "Parent communication",
      "Safeguarding",
    ],
  },
  "/student-life": {
    eyebrow: "Beyond the classroom",
    title: "Student Life",
    subtitle: "Explore. Participate. Belong.",
    description:
      "Student life brings learning to life through experiences, activities and opportunities to contribute.",
    cards: [
      "Sports",
      "Arts",
      "Science",
      "Technology",
      "Debates",
      "Public speaking",
      "Competitions",
      "Clubs",
      "Field trips",
      "Community service",
      "Cultural activities",
      "Leadership activities",
    ],
  },
} as const;

export type ReferenceLearningPath = keyof typeof pages;

export function ReferenceLearningPage({ path }: { path: ReferenceLearningPath }) {
  const page = pages[path];
  return (
    <main className="recorded-page">
      <section className="recorded-hero">
        <div className="recorded-container">
          <p>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <h2>{page.subtitle}</h2>
          <span>{page.description}</span>
        </div>
      </section>
      <section className="recorded-content">
        <div className="recorded-container">
          {"flow" in page ? (
            <div className="recorded-pills">
              {page.flow.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
          <div className="recorded-cards">
            {page.cards.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item}</h3>
                <p>
                  Purposeful learning experiences designed for confident, capable and future-ready
                  learners.
                </p>
              </article>
            ))}
          </div>
          {path === "/student-wellbeing" ? (
            <aside className="recorded-notice">[Official safeguarding policy to be provided]</aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}

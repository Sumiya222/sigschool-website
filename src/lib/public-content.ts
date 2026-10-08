import { MISSING_CONTENT } from "@/lib/brand";

export interface PublicSection {
  id?: string;
  title: string;
  body: string;
  items?: readonly string[];
}
export interface PublicPage {
  title: string;
  eyebrow: string;
  intro: string;
  sections: readonly PublicSection[];
  actions?: readonly { label: string; href: string }[];
}

const missing = (label: string): PublicSection => ({ title: label, body: MISSING_CONTENT });

export const PUBLIC_PAGES: Record<string, PublicPage> = {
  "/about": {
    title: "About The Signature School",
    eyebrow: "Our School",
    intro:
      "An education brand built around learning that creates knowledge, capability, character and opportunity.",
    sections: [
      {
        title: "Brand Philosophy",
        body: "Learning should prepare students not only to understand the world, but to participate in it with confidence, purpose and practical capability.",
      },
      {
        title: "LEARN Core Values",
        body: "Our values connect academic excellence with leadership, entrepreneurship, real-world readiness and innovation.",
        items: [
          "Leadership & Character",
          "Excellence in Education",
          "Ambition & Entrepreneurship",
          "Readiness for the Real World",
          "Novel Technology & Innovation",
        ],
      },
      missing("Governance and Leadership"),
    ],
    actions: [{ label: "Explore Learn To Earn", href: "/learn-to-earn" }],
  },
  "/about/our-story": {
    title: "Our Story",
    eyebrow: "About",
    intro:
      "The Signature School is shaped by a simple idea: education should turn knowledge into confidence, character and useful capability.",
    sections: [
      {
        title: "Why We Exist",
        body: "We connect strong academics with technology fluency, leadership, financial understanding and readiness for life beyond the classroom.",
      },
      {
        title: "The Signature Promise",
        body: "Every part of the learning experience is designed around the LEARN values: Leadership, Excellence, Ambition, Readiness and Novel thinking.",
      },
      missing("Verified founding history and institutional milestones"),
    ],
  },
  "/about/vision-mission": {
    title: "Vision & Mission",
    eyebrow: "About",
    intro:
      "The Signature Schools combines accessible education, strong academics, values and digital learning to prepare every child for the future.",
    sections: [
      {
        title: "Our Vision",
        body: "To develop confident, ethical and future-ready learners through a modern digital learning ecosystem that empowers every child to learn deeply, lead responsibly and grow with purpose.",
      },
      {
        title: "Our Mission",
        body: "To provide accessible, high-quality and value-integrated education through a bookless digital model that combines strong academics, technology, project-based learning, creativity, life skills, character development and real-world readiness.",
      },
    ],
  },
  "/about/chairperson": {
    title: "Chairperson's Message",
    eyebrow: "About",
    intro: "Engr. Dr. Muhammad Afzal (Lt. Gen. Retd., HI(M)) — Chairperson",
    sections: [missing("Approved Chairperson portrait and 80–120 word profile")],
  },
  "/about/educational-philosophy": {
    title: "Educational Philosophy",
    eyebrow: "About",
    intro:
      "Students learn best when knowledge, experience, reflection and purposeful action work together.",
    sections: [
      {
        title: "Knowledge Into Capability",
        body: "Learning is connected to communication, problem solving, creativity and responsible decision-making so students can use what they know.",
      },
      {
        title: "Whole-Child Development",
        body: "Academic growth sits alongside character, wellbeing, leadership and respect for others.",
      },
      {
        title: "Future-Ready Practice",
        body: "Technology and innovation support thoughtful learning; they do not replace excellent teaching, curiosity or sound judgement.",
      },
    ],
  },
  "/about/leadership": {
    title: "Leadership",
    eyebrow: "About",
    intro: "Meet the people responsible for the direction and academic stewardship of the school.",
    sections: [
      missing("Leadership names, roles, biographies and approved photographs"),
      missing("Governance structure and official responsibilities"),
    ],
  },
  "/about/at-a-glance": {
    title: "At a Glance",
    eyebrow: "About",
    intro: "A concise institutional overview will appear here when verified data is supplied.",
    sections: [
      missing("Official institutional statistics"),
      missing("Campus and enrolment overview"),
    ],
  },
  "/about/teacher-training": {
    title: "Teacher Training",
    eyebrow: "About",
    intro:
      "Teacher development supports consistent, thoughtful and future-ready learning practice.",
    sections: [missing("Approved training framework and programme details")],
  },
  "/about/alumni": {
    title: "Alumni",
    eyebrow: "Community",
    intro: "The alumni programme and verified stories are awaiting approved content.",
    sections: [missing("Alumni network information")],
  },
  "/about/notices": {
    title: "Notices",
    eyebrow: "Updates",
    intro: "No approved public notices are currently available.",
    sections: [{ title: "Current notices", body: "No current notices." }],
  },
  "/about/signature-school": {
    title: "Why Signature School",
    eyebrow: "Our Difference",
    intro:
      "Academic strength meets technology fluency, financial literacy, leadership and real-world readiness.",
    sections: [
      {
        title: "A Modern Academic Identity",
        body: "The Signature School positions learning as a foundation for capable, ethical and ambitious participation in the real world.",
      },
    ],
  },
  "/academics": {
    title: "Academics",
    eyebrow: "Teaching & Learning",
    intro:
      "A connected learning journey designed to build knowledge, critical thinking and confident application.",
    sections: [
      {
        title: "Academic Pathways",
        body: "The website recognises four stages of learning.",
        items: ["Early Years", "Primary", "Middle School", "Secondary"],
      },
      missing("Approved curriculum, subjects and board affiliations"),
      missing("Current academic calendars"),
    ],
    actions: [
      { label: "Admissions", href: "/admissions" },
      { label: "Examinations", href: "/examinations" },
    ],
  },
  "/examinations": {
    title: "Examinations & Assessment",
    eyebrow: "Academics",
    intro: "Assessment should support learning, reflection and measurable progress.",
    sections: [missing("Approved assessment, grading and promotion policy")],
  },
  "/admissions": {
    title: "Admissions",
    eyebrow: "Start Your Journey",
    intro:
      "Explore the admission journey and submit an enquiry when you are ready to speak with the school.",
    sections: [
      {
        title: "Admission Journey",
        body: "The final procedure, eligibility rules and required documents are awaiting official approval.",
      },
      missing("Age eligibility, fees and required documents"),
    ],
    actions: [
      { label: "View Admission Procedure", href: "/admission-procedure" },
      { label: "Apply Online", href: "/apply-online" },
    ],
  },
  "/admission-procedure": {
    title: "Admission Procedure",
    eyebrow: "Admissions",
    intro:
      "A clear journey from first enquiry to enrolment. Final requirements, timings and fees remain subject to official confirmation.",
    sections: [
      {
        title: "1. Explore",
        body: "Review the school philosophy, academic pathways and available public information.",
      },
      {
        title: "2. Find a Campus",
        body: "Choose a verified campus when the official campus directory becomes available.",
      },
      {
        title: "3. Submit an Enquiry",
        body: "Share basic contact and learner information through an approved channel.",
      },
      missing("4. Official eligibility and age criteria"),
      missing("5. Required documents"),
      missing("6. Assessment and interview process"),
      missing("7. Fee schedule and offer terms"),
      missing("8. Enrolment confirmation and orientation"),
    ],
  },
  "/apply-online": {
    title: "Apply Online",
    eyebrow: "Admissions",
    intro:
      "The production application workflow is not yet approved. No application will be represented as submitted until storage and notification are confirmed.",
    sections: [missing("Campus, academic year, programme and consent data")],
  },
  "/learn-to-earn": {
    title: "Learn To Earn",
    eyebrow: "Our Promise",
    intro:
      "Learning builds the knowledge, confidence and character to create value, recognise opportunity and participate meaningfully in the real world.",
    sections: [
      {
        title: "Learn",
        body: "Build academic knowledge, technology fluency, critical thinking and the discipline to keep growing.",
      },
      {
        title: "Earn",
        body: "Develop practical, financial and entrepreneurial capability grounded in responsibility and character.",
      },
      {
        title: "LEARN",
        body: "A connected values framework for the student experience.",
        items: [
          "Leadership & Character",
          "Excellence in Education",
          "Ambition & Entrepreneurship",
          "Readiness for the Real World",
          "Novel Technology & Innovation",
        ],
      },
    ],
    actions: [
      { label: "Explore Academics", href: "/academics" },
      { label: "Admissions", href: "/admissions" },
    ],
  },
  "/digital-learning": {
    title: "Digital Learning",
    eyebrow: "Future-Ready Learning",
    intro:
      "Technology fluency supports thoughtful research, creation, communication and problem solving.",
    sections: [
      {
        title: "Responsible Digital Use",
        body: "Technology is approached as a learning tool, with responsible use and sound judgement at its centre.",
      },
      missing("Approved platforms, tools and access model"),
    ],
  },
  "/steam": {
    title: "STEAM & Innovation",
    eyebrow: "Learning",
    intro: "Students should learn to question, design, test, create and improve.",
    sections: [
      {
        title: "Innovation Mindset",
        body: "STEAM learning connects knowledge with practical problem solving without making unsupported claims about facilities or equipment.",
      },
      missing("Approved programmes, labs and tools"),
    ],
  },
  "/future-skills": {
    title: "Future Skills",
    eyebrow: "Learning",
    intro:
      "Future readiness grows through communication, critical thinking, creativity, collaboration and responsible action.",
    sections: [
      {
        title: "Skills That Transfer",
        body: "Students should be able to apply learning in new situations, explain their thinking and work constructively with others.",
        items: [
          "Critical thinking and problem solving",
          "Communication and collaboration",
          "Creativity and digital fluency",
          "Financial and entrepreneurial awareness",
          "Adaptability and self-management",
        ],
      },
      missing("Approved programmes, progression measures and student opportunities"),
    ],
  },
  "/leadership": {
    title: "Leadership & Character",
    eyebrow: "LEARN Values",
    intro: "Leadership begins with responsibility, integrity, initiative and respect for others.",
    sections: [missing("Approved leadership programmes and activities")],
  },
  "/student-wellbeing": {
    title: "Student Wellbeing",
    eyebrow: "Student Experience",
    intro:
      "A supportive learning culture should help every student feel known, respected and ready to learn.",
    sections: [missing("Approved safeguarding, inclusion and wellbeing services")],
  },
  "/student-life": {
    title: "Student Life",
    eyebrow: "Community",
    intro:
      "Student life extends learning through participation, creativity, collaboration and service.",
    sections: [missing("Verified clubs, activities, events and facilities")],
  },
  "/teacher-development": {
    title: "Teacher Development",
    eyebrow: "Teaching Excellence",
    intro: "Ongoing professional learning strengthens classroom practice and student outcomes.",
    sections: [missing("Approved teacher-development programme details")],
  },
  "/digital-school/student-portal": {
    title: "Student Portal",
    eyebrow: "Digital School",
    intro:
      "Portal information preview. Operational access and authentication have not been approved for public launch.",
    sections: [missing("Portal platform and student entitlements")],
  },
  "/digital-school/parent-portal": {
    title: "Parent Portal",
    eyebrow: "Digital School",
    intro:
      "Portal information preview. Operational access and authentication have not been approved for public launch.",
    sections: [missing("Portal platform and parent entitlements")],
  },
  "/digital-school/teacher-portal": {
    title: "Teacher Portal",
    eyebrow: "Digital School",
    intro:
      "Portal information preview. Operational access and authentication have not been approved for public launch.",
    sections: [missing("Portal platform and teacher entitlements")],
  },
  "/login": {
    title: "Portal Access",
    eyebrow: "Digital School",
    intro: "Public portal authentication details have not been supplied.",
    sections: [missing("Approved portal or SSO destination")],
  },
  "/find-a-campus": {
    title: "Find a Campus",
    eyebrow: "Locations",
    intro: "Campus search will be enabled when verified campus records are supplied.",
    sections: [missing("Campus names, locations, contacts and programmes")],
  },
  "/faqs": {
    title: "Frequently Asked Questions",
    eyebrow: "Help",
    intro: "Approved admissions, academic and campus FAQs are awaiting content.",
    sections: [missing("Official questions and answers")],
  },
  "/news-events": {
    title: "News & Events",
    eyebrow: "Updates",
    intro: "No approved public news or events are currently available.",
    sections: [{ title: "Latest updates", body: "No current articles." }],
  },
  "/careers": {
    title: "Careers",
    eyebrow: "Join Us",
    intro: "Build meaningful work around education, growth and student opportunity.",
    sections: [
      { title: "Current vacancies", body: "No current vacancies." },
      missing("HR process and application privacy requirements"),
    ],
  },
  "/careers/apply": {
    title: "Career Application",
    eyebrow: "Careers",
    intro: "Applications will open when an approved vacancy and HR workflow are available.",
    sections: [missing("Vacancy reference, application fields and consent wording")],
  },
  "/franchise": {
    title: "Partner With The Signature School",
    eyebrow: "Franchise",
    intro:
      "A dedicated partnership journey grounded in a consistent academic and brand experience.",
    sections: [
      {
        title: "Why Signature",
        body: "A distinctive education philosophy, coherent brand system and future-ready student proposition form the foundation of the partnership opportunity.",
      },
      {
        id: "network",
        title: "Our Network",
        body:
          MISSING_CONTENT + " Verified campus footprint and available territories are required.",
      },
      {
        id: "models",
        title: "Franchise Models",
        body:
          MISSING_CONTENT + " Approved formats, requirements and investment ranges are required.",
      },
      {
        id: "process",
        title: "Process",
        body: "The intended journey covers enquiry, initial review, discussion, due diligence, agreement, setup and launch. Final commercial and legal stages require approval.",
      },
      {
        id: "support",
        title: "Partner Support",
        body:
          MISSING_CONTENT +
          " Approved academic, operational, marketing and training services are required.",
      },
      {
        id: "technology",
        title: "Technology",
        body:
          MISSING_CONTENT +
          " Approved platforms, licences and implementation support are required.",
      },
    ],
    actions: [{ label: "Become a Partner", href: "/franchise/apply" }],
  },
  "/franchise/apply": {
    title: "Franchise Enquiry",
    eyebrow: "Partnership",
    intro: "Commercial terms and the production enquiry workflow require official approval.",
    sections: [missing("Approved partner criteria, territories, process and consent wording")],
  },
  "/support": {
    title: "Support",
    eyebrow: "Help Centre",
    intro: "Choose the most relevant approved contact route for your enquiry.",
    sections: [missing("Support channels and service workflow")],
  },
  "/support/tickets": {
    title: "Submit a Support Request",
    eyebrow: "Support",
    intro: "A ticket should only show success after an approved service confirms receipt.",
    sections: [missing("Support service integration and privacy wording")],
  },
  "/contact": {
    title: "Contact",
    eyebrow: "Get in Touch",
    intro: "Official public contact details are awaiting confirmation.",
    sections: [
      missing("Official phone, email and address"),
      missing("Approved enquiry categories and consent wording"),
    ],
    actions: [{ label: "Find a Campus", href: "/find-a-campus" }],
  },
  "/school": {
    title: "School Guide",
    eyebrow: "Explore",
    intro: "A practical guide to The Signature School's public information.",
    sections: [
      {
        title: "Explore the website",
        body: "Learn about the school, academics, admissions, digital learning, student experience and partnership opportunities.",
      },
    ],
    actions: [
      { label: "About", href: "/about" },
      { label: "Admissions", href: "/admissions" },
    ],
  },
};

/*
 * Public copy mirrored from the approved localhost reference implementation.
 * Keeping these overrides together prevents route components from drifting away
 * from the reference site while retaining the existing TanStack routing and forms.
 */
const referenceCards = (items: readonly string[], body: string): readonly PublicSection[] =>
  items.map((title) => ({ title, body }));

Object.assign(PUBLIC_PAGES, {
  "/about": {
    eyebrow: "About Signature School",
    title: "About Signature School",
    intro:
      "Signature School is a modern, digital-first learning environment designed to develop academically strong, confident, creative and future-ready learners.",
    sections: [
      {
        title: "Learning Today. Leading Tomorrow.",
        body: "Understanding becomes purposeful practice, creative work, collaboration and confident leadership.",
        items: ["Understand", "Practice", "Create", "Collaborate", "Lead"],
      },
    ],
    actions: [
      { label: "Explore Academics", href: "/academics" },
      { label: "Apply Online", href: "/apply-online" },
    ],
  },
  "/about/our-story": {
    eyebrow: "About Signature School",
    title: "Our Story",
    intro:
      "Signature School is a modern, digital-first school focused on meaningful learning, bookless learning experiences and future-ready education.",
    sections: referenceCards(
      [
        "Our purpose",
        "Educational approach",
        "Digital-first vision",
        "Bookless learning philosophy",
        "Future-focused direction",
      ],
      "Official supporting details will be provided by Signature School.",
    ),
  },
  "/about/vision-mission": {
    eyebrow: "About Signature School",
    title: "Vision & Mission",
    intro:
      "At Signature School, education goes beyond academic achievement. We aim to develop learners who possess knowledge, character, confidence, creativity and practical skills to succeed in a changing world.",
    sections: [
      {
        title: "Our Vision",
        body: "To develop confident, ethical and future-ready learners through a modern digital learning ecosystem that empowers every child to learn deeply, lead responsibly and grow with purpose.",
      },
      {
        title: "Our Mission",
        body: "To provide accessible, high-quality and value-integrated education through a bookless digital model that combines strong academics, technology, project-based learning, creativity, life skills, character development and real-world readiness.",
        items: [
          "Academic Excellence",
          "Character",
          "Creativity",
          "Critical Thinking",
          "Communication",
          "Leadership",
          "Digital Literacy",
          "Collaboration",
          "Problem Solving",
          "Entrepreneurial Thinking",
        ],
      },
    ],
  },
  "/academics": {
    eyebrow: "Academics",
    title: "Academics",
    intro:
      "Signature School combines strong academic foundations with digital learning, practical skills, creativity, critical thinking and collaborative learning.",
    sections: [
      {
        title: "Early Years / Preschool",
        body: "Building early foundations through purposeful exploration.",
        items: [
          "Early literacy",
          "Numeracy",
          "Communication",
          "Creativity",
          "Social development",
          "Motor skills",
          "Exploration",
          "Digital awareness",
        ],
      },
      {
        title: "Primary",
        body: "Building core skills and learner confidence.",
        items: [
          "English",
          "Mathematics",
          "Science",
          "Social Studies",
          "Languages",
          "Digital literacy",
          "Creative expression",
          "Collaboration",
        ],
      },
      {
        title: "Middle School",
        body: "Developing independent thought and practical capability.",
        items: [
          "Conceptual understanding",
          "Critical thinking",
          "Computing",
          "Technology",
          "Projects",
          "Communication",
          "Leadership",
          "Problem solving",
        ],
      },
      {
        title: "Secondary",
        body: "Preparing learners for examinations and future pathways.",
        items: [
          "Academic specialization",
          "Examination preparation",
          "Independent learning",
          "Career awareness",
          "Research",
          "Leadership",
          "Future pathways",
        ],
      },
    ],
    actions: [{ label: "Apply Online", href: "/apply-online" }],
  },
  "/admissions": {
    eyebrow: "Admissions",
    title: "Admissions",
    intro:
      "Begin your child’s journey with Signature School through a clear, simple and supportive admission process.",
    sections: referenceCards(
      [
        "Discover Signature School",
        "Find a Campus",
        "Submit an Application",
        "Assessment & Meeting",
        "Admission Decision",
        "Enrollment",
      ],
      "Our admissions team guides families through each stage of the journey.",
    ),
    actions: [
      { label: "Admission Procedure", href: "/admission-procedure" },
      { label: "Apply Online", href: "/apply-online" },
    ],
  },
  "/admission-procedure": {
    eyebrow: "Admissions",
    title: "Admission Procedure",
    intro:
      "From discovering Signature School to becoming part of our learning community, our admission process is designed to be clear, simple and supportive for families.",
    sections: referenceCards(
      [
        "Explore Signature School",
        "Find a Campus",
        "Submit an Application",
        "Assessment",
        "Parent Meeting",
        "Admission Decision",
        "Enrollment",
      ],
      "Complete this stage with guidance from the Signature School admissions team.",
    ),
    actions: [{ label: "Apply Online", href: "/apply-online" }],
  },
  "/examinations": {
    eyebrow: "Academics",
    title: "Examinations & Assessment",
    intro:
      "Signature School uses continuous assessment and structured examinations to understand student progress, identify learning needs and support academic development.",
    sections: referenceCards(
      [
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
      ],
      "A configurable part of a holistic progress-support system.",
    ),
  },
  "/learn-to-earn": {
    eyebrow: "Signature Learning",
    title: "Learn to Earn",
    intro:
      "Signature School connects knowledge with practical skills, digital fluency, creativity and the confidence to create meaningful futures.",
    sections: referenceCards(
      [
        "Practical skills",
        "Digital skills",
        "Creativity",
        "Problem solving",
        "Entrepreneurship",
        "Communication",
        "Leadership",
        "Innovation",
      ],
      "Purposeful learning experiences designed for confident, capable and future-ready learners.",
    ),
  },
  "/digital-learning": {
    eyebrow: "Digital Learning",
    title: "A Smarter Way to Learn",
    intro:
      "Digital tools support engaged learning, clearer progress visibility and purposeful teaching resources.",
    sections: referenceCards(
      [
        "Digital library",
        "Digital assignments",
        "Digital assessment",
        "Progress tracking",
        "Parent visibility",
        "Student learning resources",
        "Teacher resources",
        "Analytics",
      ],
      "Connected digital support for meaningful learning.",
    ),
  },
  "/steam": {
    eyebrow: "Innovation",
    title: "STEAM & Innovation",
    intro:
      "Learning across Science, Technology, Engineering, Arts and Mathematics encourages curiosity, collaboration and real-world problem solving.",
    sections: referenceCards(
      [
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
      "Purposeful learning experiences designed for confident, capable and future-ready learners.",
    ),
  },
  "/leadership": {
    eyebrow: "Student Growth",
    title: "Leadership",
    intro:
      "Leadership experiences help learners communicate, collaborate and contribute with purpose.",
    sections: referenceCards(
      [
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
      "Purposeful learning experiences designed for confident, capable and future-ready learners.",
    ),
  },
  "/student-wellbeing": {
    eyebrow: "Student Wellbeing",
    title: "Every learner belongs.",
    intro:
      "Student wellbeing is supported through safe learning environments, positive relationships, inclusion and parent communication.",
    sections: referenceCards(
      [
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
      "A caring, respectful learning community.",
    ),
  },
  "/student-life": {
    eyebrow: "Beyond the classroom",
    title: "Student Life",
    intro:
      "Student life brings learning to life through experiences, activities and opportunities to contribute.",
    sections: referenceCards(
      [
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
      "Explore. Participate. Belong.",
    ),
  },
  "/teacher-development": {
    eyebrow: "Professional Growth",
    title: "Growing Great Teachers. Building Great Learners.",
    intro: "Teacher development supports purposeful learning experiences and student progress.",
    sections: referenceCards(
      [
        "Teaching methodologies",
        "Digital teaching",
        "Classroom management",
        "Assessment",
        "Communication",
        "Leadership",
        "Student wellbeing",
        "Technology integration",
        "Curriculum implementation",
      ],
      "Teaching that continues to evolve.",
    ),
  },
  "/find-a-campus": {
    eyebrow: "Campus Network",
    title: "Find a Campus",
    intro: "Search official Signature School campus information by province, city and area.",
    sections: [
      {
        title: "Campus information",
        body: "[Campus information to be provided]",
        items: [
          "Province — [To Be Provided]",
          "City — [To Be Provided]",
          "Area — [To Be Provided]",
          "Grades — [To Be Provided]",
          "Contact — [To Be Provided]",
        ],
      },
    ],
    actions: [{ label: "Apply Online", href: "/apply-online" }],
  },
  "/faqs": {
    eyebrow: "Help Center",
    title: "Frequently Asked Questions",
    intro:
      "Helpful answers about The Signature Schools, admissions, learning and partnership opportunities.",
    sections: [
      {
        title: "What is The Signature Schools?",
        body: "A modern school network built around a digital, bookless, value-integrated and future-ready learning model.",
      },
      {
        title: "Which classes are offered?",
        body: "The model is designed from Early Childhood Education (ECE) through Grade 7, with expansion according to campus approvals and academic planning.",
      },
      {
        title: "What does ‘bookless digital school’ mean?",
        body: "Students learn through structured digital content, teacher-guided instruction, projects, activities and carefully designed learning resources rather than depending only on traditional textbooks.",
      },
      {
        title: "What makes the school different?",
        body: "The programme blends core academics with digital learning, project-based learning, character education, financial literacy, entrepreneurship, culture, creativity, technology, robotics and future skills.",
      },
      {
        title: "How are students assessed?",
        body: "Assessment is continuous and includes classwork, activities, projects, formative assessment and term-based evaluation according to the school assessment policy.",
      },
      {
        title: "How can parents apply for admission?",
        body: "Parents may contact the school through the official phone number, email, website inquiry form or nearest campus.",
      },
      {
        title: "Does the school provide technology-based learning?",
        body: "Yes. Digital learning is a central part of the model and is designed to improve engagement, access to content, creativity and practical learning.",
      },
      {
        title: "How can someone apply for a franchise?",
        body: "Prospective partners can use the dedicated franchise inquiry form, followed by screening, orientation and formal documentation.",
      },
    ],
  },
  "/franchise": {
    eyebrow: "Partner with Signature",
    title: "Become a Franchise Partner",
    intro:
      "Join Signature School to deliver digital-first learning, academic development, practical skills and future-ready education.",
    sections: referenceCards(
      [
        "Why Signature School",
        "Franchise Model",
        "Educational Framework",
        "Academic Support",
        "Teacher Development",
        "Technology Support",
        "School Operations",
        "Marketing & Brand Support",
        "Quality & Continuous Improvement",
      ],
      "Structured guidance designed to help partner schools build a confident, connected learning community.",
    ),
    actions: [{ label: "Become a Franchise Partner", href: "/franchise/apply" }],
  },
  "/support": {
    eyebrow: "Help Center",
    title: "How Can We Help?",
    intro: "Find the right starting point for your question, request or service need.",
    sections: referenceCards(
      ["Students", "Parents", "Teachers", "Campuses", "Franchise Partners"],
      "Helpful guidance and the right support route for the Signature community.",
    ),
    actions: [{ label: "Submit a Support Request", href: "/support/tickets" }],
  },
  "/careers": {
    eyebrow: "Careers",
    title: "Grow With Signature",
    intro: "Explore opportunities across teaching, leadership, operations and support.",
    sections: referenceCards(
      [
        "Teaching",
        "Academic Leadership",
        "Campus Leadership",
        "Administration",
        "Technology",
        "Operations",
        "Marketing",
        "Student Support",
      ],
      "[Current vacancies to be provided]",
    ),
    actions: [{ label: "Apply", href: "/careers/apply" }],
  },
} satisfies Record<string, PublicPage>);

const portalPage = (title: string, intro: string, items: readonly string[]): PublicPage => ({
  eyebrow: "Digital School",
  title,
  intro,
  sections: referenceCards(items, "[Feature access to be provided]"),
  actions: [{ label: "Login to Portal", href: "/login" }],
});

Object.assign(PUBLIC_PAGES, {
  "/digital-school/student-portal": portalPage(
    "Student Portal",
    "A connected space for learners to plan, participate and keep track of their progress.",
    [
      "Student profile",
      "Timetable",
      "Attendance",
      "Assignments",
      "Results",
      "Assessments",
      "Learning resources",
      "Notices",
      "Events",
    ],
  ),
  "/digital-school/parent-portal": portalPage(
    "Parent Portal",
    "Clear, timely visibility into your child’s school experience and progress.",
    [
      "Child profile",
      "Attendance",
      "Results",
      "Academic progress",
      "Teacher communication",
      "Notices",
      "Events",
      "Activities",
    ],
  ),
  "/digital-school/teacher-portal": portalPage(
    "Teacher Portal",
    "A digital workspace supporting teaching, planning and student progress.",
    [
      "Attendance",
      "Timetable",
      "Students",
      "Assessments",
      "Results",
      "Assignments",
      "Diary",
      "Planner",
      "Notices",
      "Academic records",
    ],
  ),
  "/contact": {
    eyebrow: "Contact",
    title: "Let’s Connect",
    intro:
      "Get in touch with Signature School for admissions, campus, academic, support or partnership enquiries.",
    sections: [
      { title: "Phone", body: "+92 51 2345678" },
      { title: "Email", body: "info@signatureschool.edu.pk" },
      { title: "Location", body: "Islamabad, Pakistan" },
    ],
    actions: [{ label: "Find a Campus", href: "/find-a-campus" }],
  },
  "/support/tickets": {
    eyebrow: "Help Center",
    title: "Submit a Support Request",
    intro: "Share your request and the appropriate Signature School team can guide the next step.",
    sections: [
      {
        title: "Clear support, from request to resolution",
        body: "Use the support request form to share your name, contact details, department, priority, subject and request details.",
      },
    ],
  },
  "/careers/apply": {
    eyebrow: "Careers",
    title: "Apply to Signature School",
    intro: "Submit your application for an approved current or future opportunity.",
    sections: [
      {
        title: "Take the next step in your career",
        body: "Complete the career application with your contact details, qualifications, experience, CV and cover letter.",
      },
    ],
  },
  "/franchise/apply": {
    eyebrow: "Partnership",
    title: "Become a Franchise Partner",
    intro: "Share your details and our team will guide you through the next steps.",
    sections: [
      {
        title: "Start your Signature School partnership journey",
        body: "Submit the partnership request form for review by the Signature School team.",
      },
    ],
  },
} satisfies Record<string, PublicPage>);

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  X,
} from "lucide-react";
import { aboutCards, learningModel } from "@/data/aboutData";
import { alumniContributions, alumniJourney } from "@/data/alumniData";
import { campuses, ecosystem, schoolStats } from "@/data/campusData";
import { newsArticles, type NewsArticle } from "@/data/newsData";
import { notices, type SchoolNotice } from "@/data/noticeData";
import { galleryItems, schoolEnvironment } from "@/data/schoolGalleryData";
import { developmentCycle, teacherSystems, trainingAreas } from "@/data/teacherTrainingData";

function Crumbs({ current }: { current: string }) {
  return (
    <nav className="about-crumbs" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      <a href="/about">About</a>
      <span>/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}
function Hero({
  eyebrow = "About Signature School",
  title,
  subtitle,
  description,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  description?: string;
}) {
  return (
    <header className="about-page-hero">
      <div className="tss-container">
        <Crumbs current={title} />
        <p className="ref-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
        {description && <p>{description}</p>}
      </div>
    </header>
  );
}
function Section({
  eyebrow,
  title,
  intro,
  dark = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`about-section ${dark ? "about-dark" : ""}`}>
      <div className="tss-container">
        {eyebrow && <p className="ref-kicker">{eyebrow}</p>}
        <h2>{title}</h2>
        {intro && <p className="about-intro">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
function Cta() {
  return (
    <section className="about-cta">
      <div className="tss-container">
        <div>
          <p className="ref-kicker">Discover the Signature School Experience</p>
          <h2>Learning Today. Leading Tomorrow.</h2>
        </div>
        <div>
          <a className="ref-btn ref-btn-outline" href="/academics">
            Explore Academics
          </a>
          <a className="ref-btn ref-btn-gold" href="/apply-online">
            Apply Online <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}

function NewsCards({ limit }: { limit?: number }) {
  return (
    <div className="about-news-grid">
      {newsArticles.slice(0, limit).map((article) => (
        <a href={`/news-events/${article.slug}`} className="about-news-card" key={article.id}>
          <div className="about-image-wrap">
            <img src={article.image} alt="Sample school-news layout placeholder" />
            <span>{article.placeholder ? "Sample / Placeholder" : article.category}</span>
          </div>
          <div>
            <small>{article.date}</small>
            <h3>{article.title}</h3>
            <p>{article.shortDescription}</p>
            <strong>
              Read More <ArrowRight />
            </strong>
          </div>
        </a>
      ))}
    </div>
  );
}

export function AboutOverviewPage() {
  return (
    <>
      <Hero
        title="About Signature School"
        subtitle="Learning Today. Leading Tomorrow."
        description="Signature School is a modern, digital-first learning environment designed to develop academically strong, confident, creative and future-ready learners."
      />
      <Section eyebrow="Explore Our School" title="Discover Signature School">
        <div className="about-entry-grid">
          {aboutCards.map((card, i) => (
            <a href={card.href} key={card.href}>
              <span>0{i + 1}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <strong>
                {card.cta} <ArrowRight />
              </strong>
            </a>
          ))}
        </div>
      </Section>
      <Section eyebrow="Educational Philosophy" title="Learning Beyond the Classroom">
        <p className="about-intro">
          Understanding becomes purposeful practice, creative work, collaboration and confident
          leadership.
        </p>
        <div className="about-process">
          {learningModel.map(([title, body], i) => (
            <article key={title}>
              <span>{i + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="News & Events" title="What's Happening at Signature School">
        <NewsCards limit={3} />
      </Section>
      <Cta />
    </>
  );
}

const referenceAboutDetails = {
  story: {
    title: "Our Story",
    subtitle: "A future-focused learning community",
    description:
      "Signature School is a modern, digital-first school focused on meaningful learning, bookless learning experiences and future-ready education.",
    sections: [
      "Our purpose",
      "Educational approach",
      "Digital-first vision",
      "Bookless learning philosophy",
      "Future-focused direction",
    ],
  },
  philosophy: {
    title: "Learning Beyond the Classroom",
    subtitle: "Understand → Practice → Create → Collaborate → Lead",
    description:
      "The Signature approach brings knowledge, purposeful practice, creative work and collaboration together in every learner’s journey.",
    sections: ["Understand", "Practice", "Create", "Collaborate", "Lead"],
  },
  leadership: {
    title: "Leadership",
    subtitle: "People who guide our purpose",
    description: "[Official leadership information to be provided]",
    sections: [
      "Founder / Chairperson",
      "School Leadership",
      "Academic Leadership",
      "Administration",
    ],
  },
} as const;

function ReferenceAboutDetail({ page }: { page: keyof typeof referenceAboutDetails }) {
  const content = referenceAboutDetails[page];
  return (
    <>
      <Hero title={content.title} subtitle={content.subtitle} description={content.description} />
      <Section eyebrow="About Signature School" title={content.title}>
        <div className="about-pillar-grid about-reference-detail">
          {content.sections.map((item, index) => (
            <article key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item}</h3>
              <p>[TO BE PROVIDED BY SIGNATURE SCHOOL]</p>
            </article>
          ))}
        </div>
      </Section>
      <Cta />
    </>
  );
}

export function OurStoryPage() {
  return <ReferenceAboutDetail page="story" />;
}

export function EducationalPhilosophyPage() {
  return <ReferenceAboutDetail page="philosophy" />;
}

export function LeadershipPage() {
  return <ReferenceAboutDetail page="leadership" />;
}

export function VisionMissionPage() {
  return (
    <>
      <Hero
        title="Vision & Mission"
        subtitle="Building a Future-Ready Generation"
        description="At Signature School, education goes beyond academic achievement. We aim to develop learners who possess knowledge, character, confidence, creativity and practical skills to succeed in a changing world."
      />
      <section className="about-section about-vision-section">
        <div className="tss-container about-vision-mission">
          <article>
            <h2>Our Vision</h2>
            <p>
              “To develop a future-ready generation equipped with knowledge, character, confidence,
              creativity and practical skills to lead and contribute meaningfully to the world.”
            </p>
          </article>
          <article>
            <h2>Our Mission</h2>
            <p>
              Signature School aims to provide technology-enabled education that develops academic
              excellence, character, creativity, critical thinking, communication, leadership,
              digital literacy, collaboration, problem-solving and entrepreneurial thinking.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}

export function ChairpersonPage() {
  const focuses = [
    "Academic excellence",
    "Digital-first education",
    "Character development",
    "Creativity",
    "Innovation",
    "Leadership",
    "Practical learning",
    "Future readiness",
    "Parent partnership",
  ];
  return (
    <>
      <Hero title="Chairperson's Message" subtitle="A Vision for the Future of Education" />
      <Section eyebrow="Leadership" title="A message from our Chairperson">
        <div className="about-chair">
          <div
            className="about-portrait"
            role="img"
            aria-label="Official Chairperson photograph placeholder"
          >
            <img src={galleryItems[0].src} alt="Illustrative campus placeholder" />
            <span>[Official Chairperson Photograph — To Be Provided]</span>
          </div>
          <article>
            <p className="ref-kicker">Chairperson — Signature School</p>
            <h3>[Chairperson Name — To Be Provided]</h3>
            <blockquote>
              Welcome to Signature School. Our purpose is to create an educational environment in
              which every learner can build strong academic foundations, develop sound character and
              gain the confidence to participate in a rapidly changing world. We believe that
              technology is most valuable when it strengthens excellent teaching, meaningful
              relationships and purposeful learning. Together with our teachers and parents, we aim
              to help students become thoughtful, capable and responsible future leaders.
            </blockquote>
            <p className="about-note">
              The official Chairperson name, photograph and approved message are required before
              publication.
            </p>
          </article>
        </div>
      </Section>
      <Section eyebrow="Our Direction" title="Education with purpose">
        <div className="about-tag-grid">
          {focuses.map((item) => (
            <span key={item}>
              <Check /> {item}
            </span>
          ))}
        </div>
      </Section>
      <Cta />
    </>
  );
}

export function AtAGlancePage() {
  return (
    <>
      <Hero
        title="Signature School at a Glance"
        subtitle="A Connected Ecosystem for Future-Ready Learning"
      />
      <Section eyebrow="Institutional Overview" title="At a Glance">
        <div className="about-stats">
          {schoolStats.map((stat) => (
            <article key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </Section>
      <Section
        eyebrow="Our School Network"
        title="A configurable campus network"
        intro="No real campus location is shown until verified data is supplied."
      >
        <div className="about-map">
          <div className="about-map-grid" aria-hidden="true"></div>
          {campuses.map((campus) => (
            <article key={campus.id}>
              <MapPin />
              <div>
                <h3>{campus.name}</h3>
                <p>{campus.city}</p>
                <span>{campus.area}</span>
              </div>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="Connected Community" title="Our Educational Ecosystem">
        <div className="about-pillar-grid about-six">
          {ecosystem.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Section>
      <Cta />
    </>
  );
}

export function TeacherTrainingPage() {
  return (
    <>
      <Hero
        title="Teacher Training & Professional Development"
        subtitle="Growing Great Teachers. Building Great Learners."
        description="Signature School recognizes that strong teachers are central to strong learning. Our professional development approach supports educators in academic practice, technology integration, classroom management, assessment and leadership."
      />
      <Section eyebrow="Training Areas" title="Professional learning that reaches the classroom">
        <div className="about-training-grid">
          {trainingAreas.map((area) => (
            <article key={area.title}>
              <h3>{area.title}</h3>
              <ul>
                {area.items.map((item) => (
                  <li key={item}>
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="Development Cycle" title="Continuous professional improvement" dark>
        <div className="about-cycle">
          {developmentCycle.map((step, i) => (
            <div key={step}>
              <span>{i + 1}</span>
              <strong>{step}</strong>
              {i < developmentCycle.length - 1 && <ArrowRight />}
            </div>
          ))}
        </div>
      </Section>
      <Section
        eyebrow="Digital Teacher Development"
        title="Training connected to the Digital School"
      >
        <div className="about-flow about-flow-light">
          {[
            "Teacher Training",
            "Digital Tools",
            "Academic Resources",
            "Assessment",
            "Student Progress Data",
          ].map((item, i) => (
            <div key={item}>
              <strong>{item}</strong>
              {i < 4 && <ArrowRight />}
            </div>
          ))}
        </div>
        <div className="about-tag-grid">
          {teacherSystems.map((item) => (
            <span key={item}>
              <Check />
              {item}
            </span>
          ))}
        </div>
      </Section>
      <Cta />
    </>
  );
}

export function AlumniPage() {
  return (
    <>
      <Hero
        title="Signature Alumni"
        subtitle="Learning Continues Beyond the Classroom"
        description="Signature School's alumni community can become a lifelong network connecting former students with the school, current learners, teachers and one another."
      />
      <Section eyebrow="Alumni & Signature School" title="A lifelong learning community">
        <div className="about-pillar-grid about-six">
          {alumniContributions.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="Proposed Statements" title="Alumni Vision & Mission">
        <div className="about-two-col">
          <article>
            <h3>Alumni Vision</h3>
            <p>
              To build a connected alumni community that continues learning, sharing, mentoring and
              contributing to the growth of future Signature School learners.
            </p>
          </article>
          <article>
            <h3>Alumni Mission</h3>
            <p>
              To connect Signature alumni with students and the school community through mentorship,
              knowledge sharing, professional engagement, community activities and lifelong
              relationships.
            </p>
          </article>
        </div>
        <p className="about-note">
          These are proposed statements and remain editable until officially approved.
        </p>
      </Section>
      <Section eyebrow="Alumni & Digital School" title="From experience to opportunity" dark>
        <div className="about-flow">
          {alumniJourney.map((item, i) => (
            <div key={item}>
              <strong>{item}</strong>
              {i < alumniJourney.length - 1 && <ArrowRight />}
            </div>
          ))}
        </div>
      </Section>
      <Cta />
    </>
  );
}

export function NoticesPage() {
  return (
    <>
      <Hero title="Important Notices" subtitle="Official Updates from Signature School" />
      <Section
        eyebrow="Notice Board"
        title="Current notices"
        intro="Read current school guidance and clearly marked updates awaiting official dates."
      >
        <div className="about-notices">
          {notices.map((notice) => (
            <NoticeCard notice={notice} key={notice.id} />
          ))}
        </div>
      </Section>
      <Cta />
    </>
  );
}
function NoticeCard({ notice }: { notice: SchoolNotice }) {
  return (
    <a href={`/about/notices/${notice.id}`}>
      <div>
        <span>{notice.category}</span>
        <small>{notice.date}</small>
      </div>
      <h3>{notice.title}</h3>
      <p>{notice.description}</p>
      <strong>
        View Notice <ArrowRight />
      </strong>
    </a>
  );
}
export function NoticeDetailPage({ notice }: { notice?: SchoolNotice }) {
  if (!notice)
    return (
      <>
        <Hero title="Notice Not Found" subtitle="This notice is unavailable." />
        <Cta />
      </>
    );
  return (
    <>
      <Hero title={notice.title} subtitle={notice.category} />
      <Section eyebrow={notice.date} title="Notice">
        <div className="about-article">
          <p>{notice.content}</p>
          {notice.attachment ? (
            <a className="ref-btn ref-btn-outline-dark" href={notice.attachment} download>
              <Download />
              Download attachment
            </a>
          ) : (
            <p className="about-note">Attachments: [TO BE PROVIDED BY SIGNATURE SCHOOL]</p>
          )}
          <a href="/about/notices">
            <ArrowLeft /> Back to Important Notices
          </a>
        </div>
      </Section>
    </>
  );
}

export function NewsListingPage() {
  return (
    <>
      <Hero title="News & Events" subtitle="What's Happening at Signature School" />
      <Section
        eyebrow="Latest Updates"
        title="School news and events"
        intro="Explore school announcements, learning updates and upcoming community events."
      >
        <NewsCards />
      </Section>
      <Cta />
    </>
  );
}
export function NewsDetailPage({ article }: { article?: NewsArticle }) {
  if (!article)
    return (
      <>
        <Hero title="Article Not Found" subtitle="This article is unavailable." />
        <Cta />
      </>
    );
  return (
    <>
      <Hero title={article.title} subtitle={article.category} description={article.date} />
      <Section
        eyebrow={article.placeholder ? "Sample / Placeholder" : article.category}
        title="Article"
      >
        <div className="about-article">
          <img src={article.image} alt="Sample article layout placeholder" />
          {article.content.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <a href="/news-events">
            <ArrowLeft /> Back to News & Events
          </a>
        </div>
      </Section>
      <Section eyebrow="Related News" title="More from Signature School">
        <NewsCards limit={3} />
      </Section>
    </>
  );
}

export function SignatureSchoolPage() {
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (active === null) return;
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((active + 1) % galleryItems.length);
      if (event.key === "ArrowLeft")
        setActive((active - 1 + galleryItems.length) % galleryItems.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
  const item = active === null ? null : galleryItems[active];
  return (
    <>
      <Hero
        title="Welcome to Signature School"
        subtitle="A Modern Environment for Future-Ready Learning"
      />
      <Section
        eyebrow="School Gallery"
        title="Explore the Signature environment"
        intro="All images below are labelled placeholders until official Signature School photography is supplied."
      >
        <div className="about-gallery">
          {galleryItems.map((image, index) => (
            <button key={image.id} onClick={() => setActive(index)}>
              <img src={image.src} alt={image.alt} />
              <span>{image.category}</span>
              <small>Official image to be provided</small>
            </button>
          ))}
        </div>
      </Section>
      <Section eyebrow="Our Environment" title="Designed for learning">
        <div className="about-pillar-grid about-six">
          {schoolEnvironment.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Section>
      <Cta />
      {item && (
        <div
          className="about-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${item.category} image preview`}
        >
          <button
            className="about-lightbox-close"
            onClick={() => setActive(null)}
            aria-label="Close gallery"
          >
            <X />
          </button>
          <button
            onClick={() => setActive((active! - 1 + galleryItems.length) % galleryItems.length)}
            aria-label="Previous image"
          >
            <ChevronLeft />
          </button>
          <figure>
            <img src={item.src} alt={item.alt} />
            <figcaption>{item.caption}</figcaption>
          </figure>
          <button
            onClick={() => setActive((active! + 1) % galleryItems.length)}
            aria-label="Next image"
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </>
  );
}

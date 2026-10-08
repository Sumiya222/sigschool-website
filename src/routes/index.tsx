import { createFileRoute } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import hero from "@/assets/signature-school-hero-v2.png";
import learning from "@/assets/reference-home/learning-experience.png";
import campus from "@/assets/reference-home/campus-life.png";
import studentLife from "@/assets/reference-home/student-life.png";
import airUniversityLogo from "@/assets/trusted/air-university.png";
import tdcpLogo from "@/assets/trusted/tdcp.png";
import universityOfGujratLogo from "@/assets/trusted/university-of-gujrat.png";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — ${BRAND.tagline}` },
      {
        name: "description",
        content:
          "A modern digital school where technology meets great teaching to build confident, capable and future-ready learners.",
      },
    ],
  }),
  component: HomePage,
});

const news = [
  [
    "News",
    "New digital learning resources now available",
    "Apr 15, 2026",
    learning,
    "new-digital-learning-resources",
  ],
  [
    "Event",
    "Science & Innovation Fair 2026",
    "May 10, 2026",
    campus,
    "science-innovation-fair-2026",
  ],
  [
    "Announcement",
    "Admissions open for 2026–27",
    "Apr 5, 2026",
    studentLife,
    "admissions-open-2026-27",
  ],
] as const;

const benefits = [
  ["▣", "Digital-First", "Learning"],
  ["▤", "World-Class", "Curriculum"],
  ["♙", "Expert", "Teachers"],
  ["♜", "Leadership", "Development"],
  ["♢", "Safe & Supportive", "Environment"],
] as const;

const admissionCards = [
  [
    "Admission Procedure",
    "Explore the Signature School admission journey from application to enrollment.",
    "Explore Admission Procedure",
    "/admission-procedure",
  ],
  [
    "Academics",
    "Explore our academic structure, learning programmes, academic calendar and school year information.",
    "Explore Academics",
    "/academics",
  ],
  [
    "Examinations",
    "Understand our assessment and examination system, including terms, quizzes, assessments and examinations.",
    "Explore Examinations",
    "/examinations",
  ],
  [
    "Apply Online",
    "Submit an online admission application for your child and begin the enrollment process.",
    "Apply Online",
    "/apply-online",
  ],
] as const;

const trustedOrganizations = [
  { logo: airUniversityLogo, name: "Air University" },
  { logo: tdcpLogo, name: "Tourism Development Corporation of Punjab" },
  { logo: universityOfGujratLogo, name: "University of Gujrat" },
  { logo: airUniversityLogo, name: "Air University" },
  { logo: tdcpLogo, name: "Tourism Development Corporation of Punjab" },
  { logo: universityOfGujratLogo, name: "University of Gujrat" },
] as const;

function HomePage() {
  return (
    <div className="reference-home">
      <section
        className="reference-hero"
        style={{ "--reference-hero": `url(${hero})` } as CSSProperties}
      >
        <div className="reference-container ref-hero-grid">
          <div className="hero-copy">
            <p className="reference-eyebrow">The future of learning</p>
            <h1>Signature School</h1>
            <p>
              A modern digital school, where technology meets great teaching to build confident,
              capable and future-ready learners.
            </p>
            <div>
              <a className="reference-button reference-gold" href="/about">
                Explore Signature School →
              </a>
              <a className="reference-button reference-outline" href="/digital-learning">
                ◉ Watch Our Video
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="benefit-bar reference-container">
        {benefits.map(([icon, one, two]) => (
          <article key={one}>
            <span>{icon}</span>
            <b>
              {one}
              <br />
              {two}
            </b>
          </article>
        ))}
      </section>

      <section className="video-section reference-container">
        <div className="video-art" style={{ "--video-art": `url(${learning})` } as CSSProperties}>
          <span>▶</span>
          <div>
            THE SIGNATURE LEARNING EXPERIENCE
            <br />
            <small>Watch how our digital learning model works</small>
          </div>
        </div>
        <div className="video-copy">
          <p className="reference-eyebrow">The Signature learning experience</p>
          <h2>
            Digital Learning
            <br />
            Reimagined
          </h2>
          <p>
            Our unique digital-first model combines the best of technology and human connection.
            Watch how Signature School creates an engaging, flexible and effective learning
            experience for every student.
          </p>
          <a className="reference-button reference-outline" href="/digital-learning">
            ◉ Watch How It Works
          </a>
        </div>
      </section>

      <section className="welcome-section">
        <div className="reference-container welcome-grid">
          <div>
            <p className="reference-eyebrow">Welcome to Signature School</p>
            <h2>More Than a School</h2>
            <p>
              Signature School is a modern digital school designed to inspire, educate and empower
              students for a bright future. We believe in nurturing curiosity, creativity and
              leadership in every learner.
            </p>
            <a className="reference-button reference-outline" href="/about">
              Discover Signature School →
            </a>
          </div>
          <div className="campus-art" style={{ "--campus-art": `url(${campus})` } as CSSProperties}>
            SIGNATURE
            <br />
            <b>SCHOOL CAMPUS</b>
          </div>
          <aside>
            <article className="home-purpose-card home-vision-card">
              <span>01</span>
              <b>Our Vision</b>
              <p>
                To develop confident, ethical and future-ready learners through a modern digital
                learning ecosystem that empowers every child to learn deeply, lead responsibly and
                grow with purpose.
              </p>
              <a href="/about/vision-mission">Explore our direction →</a>
            </article>
            <article className="home-purpose-card home-mission-card">
              <span>02</span>
              <b>Our Mission</b>
              <p>
                To provide accessible, high-quality and value-integrated education through a
                bookless digital model combining academics, technology, creativity, life skills and
                real-world readiness.
              </p>
              <a href="/about/vision-mission">Read vision and mission →</a>
            </article>
          </aside>
        </div>
      </section>

      <section className="home-admissions">
        <div className="reference-container">
          <p className="reference-eyebrow">Admissions at Signature School</p>
          <h2>Every learning journey begins with a confident first step.</h2>
          <div className="admission-cards">
            {admissionCards.map(([title, text, cta, path], index) => (
              <a className="admission-card" href={path} key={title}>
                <span>{["01", "02", "03", "04"][index]}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <b>{cta} →</b>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="home-franchise">
        <div className="home-franchise-panel">
          <div className="home-franchise-content">
            <div className="home-franchise-intro">
              <p className="reference-eyebrow">Partner with Signature School</p>
              <h2>Become a Franchise Partner</h2>
              <p>
                Build a future-focused learning community with our academic framework, digital
                ecosystem and dedicated partner support.
              </p>
            </div>
            <div className="home-franchise-benefits">
              {[
                ["01", "Academic framework", "Structured educational and implementation guidance"],
                [
                  "02",
                  "Teacher growth",
                  "Professional development connected to classroom practice",
                ],
                ["03", "Digital ecosystem", "Technology support for learning and operations"],
                ["04", "Partner success", "Quality, operations and continuous-growth support"],
              ].map(([number, title, description]) => (
                <a href="/franchise" key={title}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </div>
                  <b aria-hidden>↗</b>
                </a>
              ))}
            </div>
            <div className="home-franchise-actions">
              <a className="reference-button reference-gold" href="/franchise/apply">
                Register Your Interest →
              </a>
              <a className="reference-button home-franchise-outline" href="/franchise">
                Explore Franchise Details
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="trusted-section" aria-labelledby="trusted-title">
        <div className="reference-container trusted-heading">
          <p>Trusted By</p>
          <h2 id="trusted-title">110+ Leading Universities And Companies</h2>
          <span aria-hidden />
          <p>Our students thrive in top universities and companies worldwide.</p>
        </div>

        <div className="trusted-marquee" aria-label="Trusted universities and companies">
          <div className="trusted-marquee-track">
            {[0, 1].map((group) => (
              <div className="trusted-logo-group" aria-hidden={group === 1} key={group}>
                {trustedOrganizations.map((organization, index) => (
                  <article
                    className="trusted-logo-card"
                    key={`${group}-${organization.name}-${index}`}
                  >
                    <img src={organization.logo} alt={`${organization.name} logo`} />
                    <span>{organization.name}</span>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="news-section">
        <div className="reference-container">
          <div className="news-head">
            <h3>Latest News & Events</h3>
            <a href="/news-events">View All →</a>
          </div>
          <div className="news-row">
            {news.map(([type, title, date, image, slug]) => (
              <a href={`/news-events/${slug}`} key={title}>
                <img src={image} alt="" />
                <div>
                  <span>{type}</span>
                  <b>{title}</b>
                  <small>{date}</small>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/franchise/")({ component: FranchisePage });

const journey = [
  "Register Interest",
  "Initial Consultation",
  "Application & Evaluation",
  "Location/Campus Assessment",
  "Approval",
  "Agreement",
  "Campus Preparation",
  "Teacher Training",
  "Technology Setup",
  "Launch",
] as const;

function FranchisePage() {
  return (
    <>
      <header className="franchise-why-hero">
        <div className="tss-container">
          <p className="ref-kicker">Partner with Signature</p>
          <h1>Become a Franchise Partner</h1>
          <h2>Build a modern education ecosystem</h2>
          <p>
            Join Signature School to deliver digital-first learning, academic development, practical
            skills and future-ready education.
          </p>
        </div>
      </header>
      <section className="franchise-journey-page" id="why-signature">
        <div className="franchise-journey-inner">
          <p className="reference-eyebrow">Franchise Process</p>
          <h1>A supported launch journey</h1>
          <div className="franchise-timeline">
            {journey.map((title, index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{title}</h2>
                  <p>
                    Move through this stage with the appropriate Signature School guidance and
                    approvals.
                  </p>
                </div>
              </article>
            ))}
          </div>
          <a className="franchise-journey-cta" href="/franchise/apply">
            Become a Franchise Partner →
          </a>
        </div>
      </section>
    </>
  );
}

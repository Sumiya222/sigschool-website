import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitInquiry } from "@/lib/inquiries.functions";

const audiences = [
  ["01", "Parents", "Helpful guidance and the right support route for parents."],
  ["02", "Students", "Helpful guidance and the right support route for students."],
  ["03", "Teachers", "Helpful guidance and the right support route for teachers."],
  [
    "04",
    "School Administrators",
    "Helpful guidance and the right support route for school administrators.",
  ],
  [
    "05",
    "Franchise Partners",
    "Helpful guidance and the right support route for franchise partners.",
  ],
] as const;
const departments = [
  "Admissions",
  "Academics",
  "IT",
  "Finance",
  "Operations",
  "Student Support",
  "Franchise Support",
];

function SupportHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="about-page-hero compact-page-hero">
      <div className="tss-container">
        <p className="ref-kicker">Signature School Support</p>
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
      </div>
    </header>
  );
}

export function SupportOverviewPage() {
  return (
    <>
      <SupportHero title="Support" subtitle="Helpful guidance for every member of our community" />
      <section className="support-reference">
        <div className="support-reference-inner">
          <div className="support-audience-grid">
            {audiences.map(([number, title, description]) => (
              <article key={title}>
                <span>{number}</span>
                <h2>{title}</h2>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <div className="support-tags" aria-label="Support departments">
            {departments.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <a className="support-request-button" href="/support/tickets">
            Submit a support request →
          </a>
        </div>
      </section>
    </>
  );
}

export function SupportTicketPage() {
  const send = useServerFn(submitInquiry);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const result = await send({
        data: {
          full_name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          type: "other",
          school_name: null,
          role: null,
          message: String(form.get("details") ?? ""),
          details: {
            Department: String(form.get("department") ?? ""),
            Priority: String(form.get("priority") ?? ""),
            Subject: String(form.get("subject") ?? ""),
          },
          company: String(form.get("company") ?? ""),
        },
      });
      if (result.ok) setStatus("sent");
      else {
        setStatus("idle");
        setError(result.reason);
      }
    } catch (reason) {
      setStatus("idle");
      setError(reason instanceof Error ? reason.message : "The request could not be sent.");
    }
  }
  return (
    <>
      <SupportHero
        title="Support Request"
        subtitle="Tell us what you need and we will route it correctly"
      />
      <section className="support-ticket-section">
        <form className="support-ticket-form" onSubmit={submit}>
          <h2>Support ticket</h2>
          <label>
            Name
            <input name="name" required minLength={2} />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" required minLength={6} />
          </label>
          <label>
            Department
            <select name="department" required defaultValue="">
              <option value="" disabled>
                Select department
              </option>
              {departments.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" required defaultValue="">
              <option value="" disabled>
                Select priority
              </option>
              <option>Normal</option>
              <option>Important</option>
              <option>Urgent</option>
            </select>
          </label>
          <label>
            Subject
            <input name="subject" required />
          </label>
          <label className="support-details">
            Request details
            <textarea name="details" required minLength={10} />
          </label>
          <input className="contact-honeypot" name="company" tabIndex={-1} autoComplete="off" />
          {error && <p className="contact-form-status contact-form-error">{error}</p>}
          {status === "sent" ? (
            <p className="contact-form-status">Your support request has been received.</p>
          ) : (
            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Submitting…" : "Submit Request"}
            </button>
          )}
        </form>
      </section>
    </>
  );
}

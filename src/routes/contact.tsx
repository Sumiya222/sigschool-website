import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { submitInquiry, type InquiryType } from "@/lib/inquiries.functions";

export const Route = createFileRoute("/contact")({ component: ContactPage });

const supportCards = [
  ["Service desk", "Questions, support requests and feedback.", "/support"],
  [
    "Find a campus",
    "Province, city and area filters will show verified active campuses.",
    "/find-a-campus",
  ],
  ["Careers", "Submit a CV or view approved vacancies.", "/careers"],
  ["Frequently asked questions", "Answers for prospective and current families.", "/faqs"],
] as const;

function ContactPage() {
  const send = useServerFn(submitInquiry);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    setError("");
    try {
      const result = await send({
        data: {
          full_name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          type: String(form.get("type") ?? "other") as InquiryType,
          message: String(form.get("message") ?? ""),
          school_name: null,
          role: null,
          details: {},
          company: String(form.get("company") ?? ""),
        },
      });
      if (result.ok) setState("sent");
      else {
        setState("idle");
        setError(result.reason);
      }
    } catch (reason) {
      setState("idle");
      setError(reason instanceof Error ? reason.message : "Your message could not be sent.");
    }
  }

  return (
    <>
      <header className="about-page-hero compact-page-hero">
        <div className="tss-container">
          <p className="ref-kicker">Contact Signature School</p>
          <h1>Contact Us</h1>
          <h2>We will help you reach the right team</h2>
        </div>
      </header>
      <section className="contact-reference">
        <div className="contact-reference-inner">
          <div className="contact-support">
            <p className="reference-eyebrow">Contact Signature School</p>
            <h1>Find the right support</h1>
            <div className="contact-support-grid">
              {supportCards.map(([title, body, href]) => (
                <a href={href} key={title}>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </a>
              ))}
            </div>
          </div>

          <form className="contact-message" onSubmit={submit} noValidate>
            <h2>Send a message</h2>
            <label>
              Name
              <input
                name="name"
                autoComplete="name"
                placeholder="Your name"
                required
                minLength={2}
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@email.com"
                required
              />
            </label>
            <label>
              Phone / WhatsApp
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Your contact number"
                required
                minLength={6}
              />
            </label>
            <label>
              How can we help?
              <select name="type" defaultValue="" required>
                <option value="" disabled>
                  Choose an option
                </option>
                <option value="parent">Admissions or family enquiry</option>
                <option value="other">School partnership</option>
                <option value="other">Support, careers or general enquiry</option>
              </select>
            </label>
            <label>
              Message
              <textarea
                name="message"
                placeholder="Tell us how we can help"
                required
                minLength={10}
              />
            </label>
            <input className="contact-honeypot" name="company" tabIndex={-1} autoComplete="off" />
            {error && <p className="contact-form-status contact-form-error">{error}</p>}
            {state === "sent" ? (
              <p className="contact-form-status">Thank you. Your message has been received.</p>
            ) : (
              <button type="submit" disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Send message →"}
              </button>
            )}
          </form>
        </div>
      </section>
    </>
  );
}

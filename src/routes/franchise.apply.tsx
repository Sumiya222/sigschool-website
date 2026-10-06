import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { submitInquiry } from "@/lib/inquiries.functions";

export const Route = createFileRoute("/franchise/apply")({ component: FranchiseApplyPage });

const fields = [
  ["full_name", "Full Name", "text", true],
  ["email", "Email", "email", true],
  ["phone", "Phone", "tel", true],
  ["city", "City", "text", true],
  ["province", "Province", "text", true],
  ["occupation", "Current Occupation", "text", false],
  ["education", "Educational Background", "text", false],
  ["business_experience", "Business Experience", "text", false],
  ["education_experience", "Education Sector Experience", "text", false],
  ["proposed_area", "Proposed Area", "text", false],
  ["proposed_location", "Proposed Location", "text", true],
] as const;

export function FranchiseApplyPage() {
  const send = useServerFn(submitInquiry);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    setStatus("sending");
    setError("");
    try {
      const result = await send({
        data: {
          full_name: value("full_name"),
          email: value("email"),
          phone: value("phone"),
          type: "school",
          school_name: value("proposed_location") || "Proposed Signature School campus",
          role: value("occupation"),
          message: [value("partnership_reason"), value("relevant_experience")]
            .filter(Boolean)
            .join("\n\n"),
          details: {
            City: value("city"),
            Province: value("province"),
            "Educational background": value("education"),
            "Business experience": value("business_experience"),
            "Education sector experience": value("education_experience"),
            "Proposed area": value("proposed_area"),
            "Building type": value("building_type"),
            "Additional comments": value("comments"),
          },
          company: value("company"),
        },
      });
      if (result.ok) setStatus("sent");
      else {
        setStatus("idle");
        setError(result.reason);
      }
    } catch (reason) {
      setStatus("idle");
      setError(
        reason instanceof Error ? reason.message : "The partnership request could not be sent.",
      );
    }
  }

  return (
    <>
      <header className="about-page-hero franchise-apply-hero">
        <div className="tss-container">
          <p className="ref-kicker">Partnership</p>
          <h1>Become a Franchise Partner</h1>
          <h2>Start your Signature School partnership journey</h2>
          <p>Share your details and our team will guide you through the next steps.</p>
        </div>
      </header>
      <section className="franchise-apply-section">
        <form className="franchise-partner-form" onSubmit={submit}>
          <h2>Partnership request</h2>
          {fields.map(([name, label, type, required]) => (
            <label key={name}>
              {label}
              {required && <span>*</span>}
              <input name={name} type={type} required={required} />
            </label>
          ))}
          <label>
            Why do you want to become a Signature School partner?<span>*</span>
            <textarea name="partnership_reason" required minLength={10} />
          </label>
          <label>
            Relevant experience
            <textarea name="relevant_experience" />
          </label>
          <label>
            Additional comments
            <textarea name="comments" />
          </label>
          <label>
            Building type
            <select name="building_type" defaultValue="Existing Building">
              <option>Existing Building</option>
              <option>New Construction</option>
              <option>Leased Building</option>
              <option>Site Under Consideration</option>
            </select>
          </label>
          <input className="contact-honeypot" name="company" tabIndex={-1} autoComplete="off" />
          {error && <p className="contact-form-status contact-form-error">{error}</p>}
          {status === "sent" ? (
            <p className="contact-form-status">Your partnership request has been received.</p>
          ) : (
            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Submitting…" : "Submit Partnership Request"}
            </button>
          )}
        </form>
      </section>
    </>
  );
}

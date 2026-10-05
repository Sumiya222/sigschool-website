import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { BRAND } from "@/lib/brand";

const steps = [
  "Student Information",
  "Parent / Guardian Information",
  "Address",
  "Campus & Admission",
  "Additional Information",
  "Documents",
  "Declaration",
] as const;

type ApplicationData = Record<string, string>;

export const Route = createFileRoute("/apply-online")({
  head: () => ({
    meta: [
      { title: `Apply Online | ${BRAND.name}` },
      { name: "description", content: "Begin an admission application for Signature School." },
    ],
  }),
  component: ApplyOnlinePage,
});

function Field({
  label,
  name,
  value,
  update,
  type = "text",
  required = false,
  children,
}: {
  label: string;
  name: string;
  value: string;
  update: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  children?: ReactNode;
}) {
  return (
    <label className="application-field">
      <span>
        {label} {required ? <b aria-hidden>*</b> : null}
      </span>
      {children ?? (
        <input
          name={name}
          type={type}
          required={required}
          value={type === "file" ? undefined : value}
          onChange={(event) => update(name, event.target.value)}
        />
      )}
    </label>
  );
}

function ApplyOnlinePage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ApplicationData>({});
  const [saved, setSaved] = useState(false);
  const update = (name: string, value: string) =>
    setData((current) => ({ ...current, [name]: value }));

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.localStorage.setItem("signature-school-admission-draft", JSON.stringify(data));
    setSaved(true);
  }

  return (
    <main className="application-page">
      <section className="application-hero">
        <div className="tss-container">
          <p>Admissions</p>
          <h1>Apply Online</h1>
          <h2>Begin Your Child&apos;s Journey With Signature School</h2>
          <span>Complete the application form below to prepare your admission request.</span>
        </div>
      </section>
      <ol className="application-progress" aria-label="Application progress">
        {steps.map((label, index) => (
          <li className={index <= step ? "active" : ""} key={label}>
            <button type="button" onClick={() => index < step && setStep(index)}>
              <span>{index < step ? <Check aria-hidden /> : index + 1}</span>
              <small>{label}</small>
            </button>
          </li>
        ))}
      </ol>

      <form className="application-card" onSubmit={next}>
        <h1>{steps[step]}</h1>
        <div className="application-fields">
          {step === 0 ? (
            <>
              <Field
                label="Student Full Name"
                name="studentName"
                value={data.studentName ?? ""}
                update={update}
                required
              />
              <Field
                label="Date of Birth"
                name="dateOfBirth"
                value={data.dateOfBirth ?? ""}
                update={update}
                type="date"
                required
              />
              <Field
                label="Gender"
                name="gender"
                value={data.gender ?? ""}
                update={update}
                required
              >
                <select
                  required
                  value={data.gender ?? ""}
                  onChange={(event) => update("gender", event.target.value)}
                >
                  <option value="">Select</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Prefer not to say</option>
                </select>
              </Field>
              <Field
                label="Applying Grade / Class"
                name="applyingGrade"
                value={data.applyingGrade ?? ""}
                update={update}
                required
              />
              <Field
                label="Previous School"
                name="previousSchool"
                value={data.previousSchool ?? ""}
                update={update}
              />
              <Field
                label="Current Grade / Class"
                name="currentGrade"
                value={data.currentGrade ?? ""}
                update={update}
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field
                label="Parent / Guardian Full Name"
                name="guardianName"
                value={data.guardianName ?? ""}
                update={update}
                required
              />
              <Field
                label="Relationship to Student"
                name="relationship"
                value={data.relationship ?? ""}
                update={update}
                required
              />
              <Field
                label="Email Address"
                name="guardianEmail"
                value={data.guardianEmail ?? ""}
                update={update}
                type="email"
                required
              />
              <Field
                label="Mobile Number"
                name="guardianPhone"
                value={data.guardianPhone ?? ""}
                update={update}
                type="tel"
                required
              />
              <Field
                label="Occupation"
                name="occupation"
                value={data.occupation ?? ""}
                update={update}
              />
              <Field
                label="Alternative Contact"
                name="alternatePhone"
                value={data.alternatePhone ?? ""}
                update={update}
                type="tel"
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field
                label="Street Address"
                name="address"
                value={data.address ?? ""}
                update={update}
                required
              />
              <Field label="City" name="city" value={data.city ?? ""} update={update} required />
              <Field label="District" name="district" value={data.district ?? ""} update={update} />
              <Field
                label="Province / Region"
                name="province"
                value={data.province ?? ""}
                update={update}
                required
              />
              <Field
                label="Postal Code"
                name="postalCode"
                value={data.postalCode ?? ""}
                update={update}
              />
              <Field
                label="Country"
                name="country"
                value={data.country ?? "Pakistan"}
                update={update}
                required
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field
                label="Preferred Campus"
                name="campus"
                value={data.campus ?? ""}
                update={update}
                required
              >
                <select
                  required
                  value={data.campus ?? ""}
                  onChange={(event) => update("campus", event.target.value)}
                >
                  <option value="">Select an approved campus</option>
                  <option value="pending">Campus list to be provided</option>
                </select>
              </Field>
              <Field
                label="Academic Year"
                name="academicYear"
                value={data.academicYear ?? ""}
                update={update}
                required
              />
              <Field
                label="Preferred Start Date"
                name="startDate"
                value={data.startDate ?? ""}
                update={update}
                type="date"
              />
              <Field
                label="Admission Type"
                name="admissionType"
                value={data.admissionType ?? ""}
                update={update}
                required
              >
                <select
                  required
                  value={data.admissionType ?? ""}
                  onChange={(event) => update("admissionType", event.target.value)}
                >
                  <option value="">Select</option>
                  <option>New admission</option>
                  <option>Transfer / migration</option>
                </select>
              </Field>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Field
                label="Medical or Accessibility Information"
                name="medical"
                value={data.medical ?? ""}
                update={update}
              />
              <Field
                label="Languages Spoken"
                name="languages"
                value={data.languages ?? ""}
                update={update}
              />
              <Field
                label="Interests and Activities"
                name="interests"
                value={data.interests ?? ""}
                update={update}
              />
              <Field
                label="Additional Notes"
                name="notes"
                value={data.notes ?? ""}
                update={update}
              />
            </>
          ) : null}

          {step === 5 ? (
            <div className="application-documents">
              <p>Document requirements and maximum file sizes require official confirmation.</p>
              <Field label="Student Photograph" name="photo" value="" update={update} type="file" />
              <Field
                label="Birth Certificate / B-Form"
                name="birthDocument"
                value=""
                update={update}
                type="file"
              />
              <Field
                label="Previous Academic Record"
                name="academicRecord"
                value=""
                update={update}
                type="file"
              />
            </div>
          ) : null}

          {step === 6 ? (
            <div className="application-declaration">
              <h2>Review and declaration</h2>
              <p>
                Please confirm that the information entered is accurate. Saving this form creates a
                local draft only; it does not submit an application to the school until an official
                admissions endpoint is configured.
              </p>
              <label>
                <input type="checkbox" required /> I confirm that the information provided is
                accurate.
              </label>
              {saved ? (
                <p className="application-saved">
                  Your application draft has been saved on this device.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="application-actions">
          {step > 0 ? (
            <button
              type="button"
              className="application-back"
              onClick={() => setStep((current) => current - 1)}
            >
              <ArrowLeft aria-hidden /> Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="application-next">
            {step === steps.length - 1 ? "Save Draft" : "Continue"} <ArrowRight aria-hidden />
          </button>
        </div>
      </form>
    </main>
  );
}

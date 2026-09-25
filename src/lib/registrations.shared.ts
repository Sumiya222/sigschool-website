/**
 * Shared, client-safe definitions for camp registration.
 *
 * The locked core fields live here so the public form, the CMS preview and the
 * admin exports all describe the same shape. They are deliberately NOT stored
 * in `registration_fields` — the CMS can add questions around them but can
 * never remove, reorder out or soften them.
 */

export const AGE_TRACKS = [
  { id: "junior", label: "Junior Tinkers", min: 5, max: 7 },
  { id: "young", label: "Young Innovators", min: 8, max: 12 },
  { id: "future", label: "Future Engineers", min: 13, max: 17 },
] as const;

export type AgeTrack = (typeof AGE_TRACKS)[number];

/** Track for an age, or null when the age falls outside every track. */
export function trackForAge(age: number | null | undefined): AgeTrack | null {
  if (age == null || Number.isNaN(age)) return null;
  return AGE_TRACKS.find((t) => age >= t.min && age <= t.max) ?? null;
}

export function trackLabel(track: AgeTrack): string {
  return `${track.label} (${track.min}–${track.max})`;
}

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "dropdown",
  "checkbox",
  "radio",
  "date",
  "file",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  dropdown: "Dropdown list",
  checkbox: "Tick box",
  radio: "Choose one",
  date: "Date",
  file: "File upload",
};

/** Attachment limits for `file` questions (payment receipts, forms, etc.). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
export const UPLOAD_HINT = "PDF, JPG, PNG or WEBP — up to 10MB. Documents and images only.";

export type RegistrationField = {
  id: string;
  label: string;
  field_type: FieldType;
  options: string[];
  required: boolean;
  help_text: string | null;
  order: number;
  active: boolean;
};

/** The read-only shape shown at the top of the CMS field list. */
export const LOCKED_CORE_FIELDS: { label: string; type: string; required: boolean }[] = [
  { label: "Student first name", type: "Short text", required: true },
  { label: "Student last name", type: "Short text", required: true },
  { label: "Student age", type: "Number", required: true },
  { label: "Student's school", type: "Short text", required: false },
  { label: "Parent / guardian name", type: "Short text", required: true },
  { label: "Parent email", type: "Email", required: true },
  { label: "Parent phone / WhatsApp", type: "Phone", required: true },
  { label: "Medical or accessibility notes", type: "Long text", required: false },
  { label: "Photography consent", type: "Tick box", required: false },
];

export const MEDIA_CONSENT_LABEL =
  "I consent to AstroBot Academy photographing my child during the camp for use in its materials.";

export const REGISTRATION_STATUSES = ["new", "confirmed", "waitlisted", "cancelled"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
};

/** One stored answer — the label is snapshotted so renames stay readable. */
export type CustomAnswer = {
  field_id: string;
  label: string;
  value: string;
  /** Present for `file` answers — private bucket path, admin download only. */
  storage_path?: string;
};

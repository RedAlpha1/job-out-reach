import { useState } from "react";
import { UserRound, X } from "lucide-react";
import type { Profile } from "../types";
import { EMPTY_PROFILE } from "../hooks/useProfile";

interface Props {
  initial: Profile | null;
  onSave: (profile: Profile) => void;
  /** Provided only when the modal is dismissible (i.e. a profile already exists). */
  onClose?: () => void;
}

const FIELDS: Array<{
  key: keyof Profile;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: "input" | "textarea";
  hint?: string;
}> = [
  { key: "fullName", label: "Full name", placeholder: "Aanya Sharma", required: true },
  { key: "role", label: "Current role / title", placeholder: "Senior Android Engineer", required: true },
  { key: "yearsExperience", label: "Years of experience", placeholder: "6" },
  {
    key: "skills",
    label: "Key skills",
    placeholder: "Kotlin, Jetpack Compose, Coroutines, MVVM",
    hint: "Comma-separated",
  },
  { key: "resumeUrl", label: "Resume URL", placeholder: "https://drive.google.com/...", hint: "Public Google Drive / Notion link" },
  { key: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/..." },
  {
    key: "bio",
    label: "One-liner bio",
    placeholder: "Senior Android Engineer with 6 years building high-scale production apps",
    type: "textarea",
  },
];

export function ProfileModal({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<Profile>(initial ?? EMPTY_PROFILE);

  const set = (key: keyof Profile, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const valid = form.fullName.trim() && form.role.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) onSave(form);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <div className="modal__title">
            <UserRound size={18} className="accent" />
            <h2>{initial ? "Edit profile" : "Set up your profile"}</h2>
          </div>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </header>

        <form onSubmit={submit} className="modal__body">
          {!initial && (
            <p className="muted small">
              This is used to personalise every email. Stored only in this browser.
            </p>
          )}
          {FIELDS.map((f) => (
            <label className="field" key={f.key}>
              <span className="field__label">
                {f.label}
                {f.required && <span className="req"> *</span>}
                {f.hint && <span className="field__hint"> — {f.hint}</span>}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  rows={2}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </label>
          ))}

          <div className="modal__actions">
            <button type="submit" className="btn btn--primary" disabled={!valid}>
              Save profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

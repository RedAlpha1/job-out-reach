import { Loader2, Sparkles } from "lucide-react";

interface Props {
  recipient: string;
  jd: string;
  loading: boolean;
  onRecipientChange: (v: string) => void;
  onJdChange: (v: string) => void;
  onDraft: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InputPanel({
  recipient,
  jd,
  loading,
  onRecipientChange,
  onJdChange,
  onDraft,
}: Props) {
  const emailValid = EMAIL_RE.test(recipient.trim());
  const canDraft = emailValid && !loading;

  return (
    <section className="panel">
      <h2 className="panel__title">Input</h2>

      <label className="field">
        <span className="field__label">
          HR email <span className="req">*</span>
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          placeholder="hr@razorpay.com"
          value={recipient}
          onChange={(e) => onRecipientChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canDraft) onDraft();
          }}
        />
      </label>

      <label className="field field--grow">
        <span className="field__label">
          Job description <span className="field__hint">— optional</span>
        </span>
        <textarea
          className="jd-textarea"
          placeholder="Paste the JD here to tailor the email to specific requirements…"
          value={jd}
          onChange={(e) => onJdChange(e.target.value)}
        />
      </label>

      <button className="btn btn--primary btn--block" disabled={!canDraft} onClick={onDraft}>
        {loading ? (
          <>
            <Loader2 size={16} className="spin" />
            Drafting…
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Draft email
          </>
        )}
      </button>
      {!emailValid && recipient.trim().length > 0 && (
        <p className="muted small error-text">Enter a valid email address.</p>
      )}
    </section>
  );
}

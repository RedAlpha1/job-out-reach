import { Link2, Loader2, Sparkles } from "lucide-react";

interface Props {
  recipient: string;
  jd: string;
  jobLink: string;
  loading: boolean;
  fetching: boolean;
  fetchError: string | null;
  onRecipientChange: (v: string) => void;
  onJdChange: (v: string) => void;
  onJobLinkChange: (v: string) => void;
  onFetchLink: () => void;
  onDraft: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

export function InputPanel({
  recipient,
  jd,
  jobLink,
  loading,
  fetching,
  fetchError,
  onRecipientChange,
  onJdChange,
  onJobLinkChange,
  onFetchLink,
  onDraft,
}: Props) {
  const emailValid = EMAIL_RE.test(recipient.trim());
  const canDraft = emailValid && !loading;
  const canFetch = URL_RE.test(jobLink.trim()) && !fetching;

  return (
    <section className="panel">
      <h2 className="panel__title">Input</h2>

      <label className="field">
        <span className="field__label">
          Job post link <span className="field__hint">— optional, auto-fills JD</span>
        </span>
        <div className="link-row">
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://… (public career pages work best)"
            value={jobLink}
            onChange={(e) => onJobLinkChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canFetch) onFetchLink();
            }}
          />
          <button className="btn btn--ghost link-row__btn" disabled={!canFetch} onClick={onFetchLink}>
            {fetching ? <Loader2 size={16} className="spin" /> : <Link2 size={16} />}
            Fetch
          </button>
        </div>
        {fetchError && <span className="muted small error-text">{fetchError}</span>}
      </label>

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
          placeholder="Paste the JD here, or fetch it from a link above…"
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

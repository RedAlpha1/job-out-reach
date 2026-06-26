import { useEffect, useLayoutEffect, useRef } from "react";
import { AlertCircle, Check, Copy, Mail, Send } from "lucide-react";
import type { Draft } from "../types";

interface Props {
  draft: Draft | null;
  loading: boolean;
  error: string | null;
  resumeUrl: string;
  copied: boolean;
  canSend: boolean;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onCopy: () => void;
  onOpenGmail: () => void;
  onOpenMail: () => void;
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function wordCountTone(n: number): "ok" | "warn" | "over" {
  if (n <= 150) return "ok";
  if (n <= 180) return "warn";
  return "over";
}

/** A textarea that grows to fit its content (no inner scrollbar). */
function AutoTextarea({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function GhostIllustration() {
  return (
    <svg
      className="ghost"
      width="120"
      height="92"
      viewBox="0 0 120 92"
      fill="none"
      aria-hidden="true"
    >
      <rect x="14" y="16" width="92" height="60" rx="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M18 22 60 50 102 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="28" y1="84" x2="92" y2="84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function DraftPanel({
  draft,
  loading,
  error,
  resumeUrl,
  copied,
  canSend,
  onSubjectChange,
  onBodyChange,
  onCopy,
  onOpenGmail,
  onOpenMail,
}: Props) {
  // Re-key the fade-in animation each time a fresh draft arrives.
  const fadeKey = useRef(0);
  useEffect(() => {
    if (draft) fadeKey.current += 1;
  }, [draft]);

  const words = draft ? countWords(draft.body) : 0;
  const tone = wordCountTone(words);

  return (
    <section className={`panel draft-panel${loading ? " draft-panel--loading" : ""}`}>
      <h2 className="panel__title">Draft</h2>

      {!draft && !loading && !error && (
        <div className="empty-state">
          <GhostIllustration />
          <p className="muted">Paste an HR email and hit Draft</p>
        </div>
      )}

      {loading && !draft && (
        <div className="empty-state">
          <GhostIllustration />
          <p className="muted">Writing your email…</p>
        </div>
      )}

      {error && (
        <div className="draft-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {draft && (
        <div className="draft-content" key={fadeKey.current}>
          <label className="field">
            <span className="field__label">Subject</span>
            <input
              type="text"
              value={draft.subject}
              onChange={(e) => onSubjectChange(e.target.value)}
            />
          </label>

          <label className="field field--grow">
            <span className="field__label">Body</span>
            <AutoTextarea
              className="body-textarea"
              value={draft.body}
              onChange={onBodyChange}
            />
            <span className={`word-count word-count--${tone}`}>
              {words} {words === 1 ? "word" : "words"}
              {tone === "ok" && " · within target"}
              {tone === "warn" && " · a touch long"}
              {tone === "over" && " · trim it down"}
            </span>
          </label>

          {resumeUrl && (
            <a className="resume-badge" href={resumeUrl} target="_blank" rel="noreferrer">
              <span aria-hidden="true">📎</span> Resume
            </a>
          )}

          <div className="draft-actions">
            <button className="btn btn--ghost" onClick={onCopy}>
              {copied ? (
                <>
                  <Check size={16} className="success" /> Copied
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy
                </>
              )}
            </button>
            <button className="btn btn--primary" onClick={onOpenGmail} disabled={!canSend}>
              <Send size={16} /> Open in Gmail
            </button>
            <button
              className="btn btn--ghost"
              onClick={onOpenMail}
              disabled={!canSend}
              title="Open in your default desktop mail app (mailto)"
            >
              <Mail size={16} /> Mail app
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

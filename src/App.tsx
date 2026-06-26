import { useCallback, useEffect, useRef, useState } from "react";
import { Cpu, UserRound } from "lucide-react";
import { InputPanel } from "./components/InputPanel";
import { DraftPanel } from "./components/DraftPanel";
import { ProfileModal } from "./components/ProfileModal";
import { ProviderModal } from "./components/ProviderModal";
import { History } from "./components/History";
import { isProfileComplete, useLLMSettings, useProfile } from "./hooks/useProfile";
import { useHistory } from "./hooks/useHistory";
import { useDraft } from "./hooks/useDraft";
import {
  buildGmailCompose,
  buildMailto,
  draftToClipboardText,
  openInNewTab,
  openMailto,
} from "./lib/mailto";
import { findPreset, isSettingsReady } from "./lib/providers";
import { extractJob } from "./lib/fetchJob";
import type { HistoryEntry, LLMSettings, Profile } from "./types";

export default function App() {
  const { profile, saveProfile } = useProfile();
  const { settings, saveLLMSettings } = useLLMSettings();
  const { history, addEntry, updateStatus, clearHistory } = useHistory();
  const draftState = useDraft();

  const [recipient, setRecipient] = useState("");
  const [jd, setJd] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Which modals are open. On first launch we force the provider, then the profile.
  const [showProvider, setShowProvider] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const settingsReady = isSettingsReady(settings);
  const needsProvider = !settingsReady;
  const needsProfile = !isProfileComplete(profile);

  // The history row for the currently displayed draft, so Copy/Send can
  // promote its status rather than creating duplicate rows.
  const entryId = useRef<string | null>(null);

  const copyTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  const handleDraft = useCallback(async () => {
    if (!isSettingsReady(settings)) {
      setShowProvider(true);
      return;
    }
    if (!isProfileComplete(profile)) {
      setShowProfile(true);
      return;
    }
    const result = await draftState.draftEmail(settings, profile, recipient.trim(), jd);
    if (result) {
      const role = result.context.role ?? result.draft.subject;
      const company = result.context.company ?? "—";
      entryId.current = addEntry({
        company,
        role,
        status: "Drafted",
        recipient: recipient.trim(),
        subject: result.draft.subject,
        body: result.draft.body,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, profile, recipient, jd, addEntry, draftState]);

  const handleFetchLink = useCallback(async () => {
    if (!jobLink.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const job = await extractJob(jobLink);
      const parts = [job.company, job.title, job.text].filter(Boolean);
      if (parts.length) setJd(parts.join("\n\n"));
      if (job.email && !recipient.trim()) setRecipient(job.email);
      if (!job.text && !job.email) {
        setFetchError("Fetched, but found no usable text (likely login-walled). Paste the JD manually.");
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Couldn't fetch that link.");
    } finally {
      setFetching(false);
    }
  }, [jobLink, recipient]);

  const handleSelectHistory = useCallback(
    (entry: HistoryEntry) => {
      if (entry.subject == null || entry.body == null) return;
      setRecipient(entry.recipient ?? "");
      draftState.loadDraft({ subject: entry.subject, body: entry.body });
      entryId.current = entry.id; // re-copy / re-send updates this same row
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [draftState],
  );

  const handleCopy = useCallback(async () => {
    if (!draftState.draft) return;
    try {
      await navigator.clipboard.writeText(draftToClipboardText(draftState.draft));
    } catch {
      return;
    }
    setCopied(true);
    if (entryId.current) updateStatus(entryId.current, "Copied");
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }, [draftState.draft, updateStatus]);

  const handleOpenGmail = useCallback(() => {
    if (!draftState.draft || !recipient.trim()) return;
    openInNewTab(buildGmailCompose(recipient.trim(), draftState.draft));
    if (entryId.current) updateStatus(entryId.current, "Sent");
  }, [draftState.draft, recipient, updateStatus]);

  const handleOpenMail = useCallback(() => {
    if (!draftState.draft || !recipient.trim()) return;
    openMailto(buildMailto(recipient.trim(), draftState.draft));
    if (entryId.current) updateStatus(entryId.current, "Sent");
  }, [draftState.draft, recipient, updateStatus]);

  const handleSaveProfile = useCallback(
    (p: Profile) => {
      saveProfile(p);
      setShowProfile(false);
    },
    [saveProfile],
  );

  const handleSaveProvider = useCallback(
    (next: LLMSettings) => {
      saveLLMSettings(next);
      setShowProvider(false);
    },
    [saveLLMSettings],
  );

  // First-launch gating: surface the provider modal, then the profile modal.
  const forceProvider = needsProvider;
  const forceProfile = !needsProvider && needsProfile;
  const providerOpen = showProvider || forceProvider;
  const profileOpen = (showProfile || forceProfile) && !providerOpen;

  const providerLabel = settings ? findPreset(settings.presetId)?.label.split(" ")[0] : null;

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          Outreach
        </div>
        <div className="app__header-actions">
          <button
            className="chip"
            onClick={() => setShowProvider(true)}
            title="Model provider"
          >
            <Cpu size={14} />
            <span className="chip__label">{providerLabel ?? "Model"}</span>
          </button>
          <button className="chip" onClick={() => setShowProfile(true)}>
            <UserRound size={14} />
            <span className="chip__label">Edit profile</span>
          </button>
        </div>
      </header>

      <main className="workspace">
        <InputPanel
          recipient={recipient}
          jd={jd}
          jobLink={jobLink}
          loading={draftState.loading}
          fetching={fetching}
          fetchError={fetchError}
          onRecipientChange={setRecipient}
          onJdChange={setJd}
          onJobLinkChange={setJobLink}
          onFetchLink={handleFetchLink}
          onDraft={handleDraft}
        />
        <DraftPanel
          draft={draftState.draft}
          loading={draftState.loading}
          error={draftState.error}
          resumeUrl={profile?.resumeUrl ?? ""}
          copied={copied}
          canSend={!!recipient.trim()}
          onSubjectChange={(v) => draftState.updateDraft({ subject: v })}
          onBodyChange={(v) => draftState.updateDraft({ body: v })}
          onCopy={handleCopy}
          onOpenGmail={handleOpenGmail}
          onOpenMail={handleOpenMail}
        />
      </main>

      <History history={history} onClear={clearHistory} onSelect={handleSelectHistory} />

      {providerOpen && (
        <ProviderModal
          initial={settings}
          onSave={handleSaveProvider}
          onClose={forceProvider ? undefined : () => setShowProvider(false)}
        />
      )}
      {profileOpen && (
        <ProfileModal
          initial={isProfileComplete(profile) ? profile : null}
          onSave={handleSaveProfile}
          onClose={forceProfile ? undefined : () => setShowProfile(false)}
        />
      )}
    </div>
  );
}

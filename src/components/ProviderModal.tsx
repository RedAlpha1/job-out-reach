import { useState } from "react";
import { Cpu, ExternalLink, X } from "lucide-react";
import type { LLMSettings } from "../types";
import {
  findPreset,
  isSettingsReady,
  PROVIDERS,
  settingsFromPreset,
} from "../lib/providers";

interface Props {
  initial: LLMSettings | null;
  onSave: (settings: LLMSettings) => void;
  /** Provided only when the modal is dismissible (settings already configured). */
  onClose?: () => void;
}

const FALLBACK = settingsFromPreset(PROVIDERS[0]);

export function ProviderModal({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<LLMSettings>(initial ?? FALLBACK);
  const preset = findPreset(form.presetId) ?? PROVIDERS[0];

  const choosePreset = (id: string) => {
    const next = findPreset(id);
    if (!next) return;
    // Carry the existing key over so switching providers isn't destructive.
    setForm(settingsFromPreset(next, form.apiKey));
  };

  const patch = (p: Partial<LLMSettings>) => setForm((f) => ({ ...f, ...p }));

  const ready = isSettingsReady(form);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) onSave(form);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <div className="modal__title">
            <Cpu size={18} className="accent" />
            <h2>Model provider</h2>
          </div>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </header>

        <form onSubmit={submit} className="modal__body">
          <label className="field">
            <span className="field__label">Provider</span>
            <select
              className="select"
              value={form.presetId}
              onChange={(e) => choosePreset(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.free ? "  ·  free" : ""}
                </option>
              ))}
            </select>
          </label>

          {preset.note && <p className="muted small provider-note">{preset.note}</p>}

          {preset.editableBaseUrl && (
            <label className="field">
              <span className="field__label">Base URL</span>
              <input
                type="text"
                spellCheck={false}
                placeholder="https://… or http://localhost:11434/v1"
                value={form.baseUrl}
                onChange={(e) => patch({ baseUrl: e.target.value })}
              />
            </label>
          )}

          <label className="field">
            <span className="field__label">
              Model
              {preset.modelHint && <span className="field__hint"> — {preset.modelHint}</span>}
            </span>
            <input
              type="text"
              spellCheck={false}
              placeholder="model id"
              value={form.model}
              onChange={(e) => patch({ model: e.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">
              {preset.keyLabel}
              {form.requiresKey && <span className="req"> *</span>}
            </span>
            <input
              type="password"
              spellCheck={false}
              placeholder={form.requiresKey ? "sk-…" : "leave blank if not needed"}
              value={form.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
            />
          </label>

          <p className="muted small">
            Everything is stored only in this browser and sent directly to the provider —
            never to any intermediate server.
            {preset.docsUrl && (
              <>
                {" "}
                <a href={preset.docsUrl} target="_blank" rel="noreferrer" className="inline-link">
                  Setup / keys <ExternalLink size={11} />
                </a>
              </>
            )}
          </p>

          <div className="modal__actions">
            <button type="submit" className="btn btn--primary" disabled={!ready}>
              Save provider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

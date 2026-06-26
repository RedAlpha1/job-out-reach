import type { LLMSettings } from "../types";

/**
 * The two wire protocols we know how to speak. "openai" covers the huge
 * ecosystem of OpenAI-compatible `/chat/completions` endpoints — Ollama,
 * LM Studio, llama.cpp, vLLM, Groq, OpenRouter, Together, etc.
 */
export type ProtocolKind = "anthropic" | "openai";

export interface ProviderPreset {
  id: string;
  label: string;
  kind: ProtocolKind;
  baseUrl: string;
  defaultModel: string;
  /** Whether a key is needed. Local tools (Ollama, LM Studio) need none. */
  requiresKey: boolean;
  /** Whether the user can edit the base URL (false for the fixed Anthropic host). */
  editableBaseUrl: boolean;
  keyLabel: string;
  modelHint?: string;
  docsUrl?: string;
  note?: string;
  free?: boolean;
}

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "ollama",
    label: "Ollama — local & free",
    kind: "openai",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    requiresKey: false,
    editableBaseUrl: true,
    keyLabel: "API key (not needed)",
    modelHint: "Any model you've pulled, e.g. llama3.1, qwen2.5, mistral",
    docsUrl: "https://ollama.com",
    note: "100% local and free. Install Ollama, run `ollama pull llama3.1`, and start it. You may need to allow browser access (see README).",
    free: true,
  },
  {
    id: "lmstudio",
    label: "LM Studio — local & free",
    kind: "openai",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    requiresKey: false,
    editableBaseUrl: true,
    keyLabel: "API key (not needed)",
    modelHint: "The model id shown in LM Studio's server tab",
    docsUrl: "https://lmstudio.ai",
    note: "100% local and free. Load a model in LM Studio and start its local server.",
    free: true,
  },
  {
    id: "groq",
    label: "Groq — free tier, hosted",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    requiresKey: true,
    editableBaseUrl: true,
    keyLabel: "Groq API key",
    modelHint: "e.g. llama-3.3-70b-versatile, llama-3.1-8b-instant",
    docsUrl: "https://console.groq.com/keys",
    note: "Free, very fast hosted open-source models. Grab a key from the Groq console.",
    free: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter — free models available",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-oss-120b:free",
    requiresKey: true,
    editableBaseUrl: true,
    keyLabel: "OpenRouter API key",
    modelHint: "Pick any model id; ones ending in :free cost nothing",
    docsUrl: "https://openrouter.ai/keys",
    note: "Aggregates many providers. Models tagged :free are free to use with a key.",
    free: true,
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6",
    requiresKey: true,
    editableBaseUrl: false,
    keyLabel: "Anthropic API key",
    modelHint: "e.g. claude-sonnet-4-6, claude-haiku-4-5",
    docsUrl: "https://console.anthropic.com/settings/keys",
    note: "Paid, highest-quality drafts.",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    kind: "openai",
    baseUrl: "",
    defaultModel: "",
    requiresKey: false,
    editableBaseUrl: true,
    keyLabel: "API key (if required)",
    modelHint: "Whatever model id your endpoint expects",
    note: "Any server exposing POST {baseURL}/chat/completions. Leave the key blank if it needs none.",
  },
];

export function findPreset(id: string): ProviderPreset | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Build a fresh settings object from a preset, carrying over an existing key. */
export function settingsFromPreset(
  preset: ProviderPreset,
  existingKey = "",
): LLMSettings {
  return {
    presetId: preset.id,
    kind: preset.kind,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
    apiKey: existingKey,
    requiresKey: preset.requiresKey,
  };
}

const STORAGE_KEY = "outreach_llm";
const LEGACY_KEY = "outreach_api_key";

const DEFAULT_PRESET =
  PROVIDERS.find((p) => p.id === "ollama") ?? PROVIDERS[0];

export function defaultSettings(): LLMSettings {
  return settingsFromPreset(DEFAULT_PRESET);
}

export function loadSettings(): LLMSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LLMSettings>;
      const merged = { ...defaultSettings(), ...parsed };
      return merged;
    }
    // Migration: an earlier version stored only an Anthropic key.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const anthropic = findPreset("anthropic")!;
      return settingsFromPreset(anthropic, legacy);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: LLMSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore (private mode) */
  }
}

/** A settings object is usable once it has a base URL, a model, and a key if one is required. */
export function isSettingsReady(s: LLMSettings | null): s is LLMSettings {
  if (!s) return false;
  if (!s.baseUrl.trim() || !s.model.trim()) return false;
  if (s.requiresKey && !s.apiKey.trim()) return false;
  return true;
}

export interface Profile {
  fullName: string;
  role: string;
  yearsExperience: string;
  skills: string; // comma-separated
  resumeUrl: string;
  linkedinUrl: string;
  bio: string;
}

export interface Draft {
  subject: string;
  body: string;
}

export type ApplicationStatus = "Drafted" | "Copied" | "Sent";

export interface HistoryEntry {
  id: string;
  date: string; // ISO string
  company: string;
  role: string;
  status: ApplicationStatus;
  // The actual email, so an entry can be reopened in the editor.
  // Optional for backward compatibility with entries saved before this existed.
  recipient?: string;
  subject?: string;
  body?: string;
}

/** Lightweight signals pulled out of a pasted job description. */
export interface ParsedJD {
  company: string | null;
  role: string | null;
  skills: string[];
}

/**
 * The LLM backend to draft with. Works with Anthropic or any
 * OpenAI-compatible endpoint (Ollama, LM Studio, Groq, OpenRouter, …).
 */
export interface LLMSettings {
  /** Which preset this was created from (or "custom"). */
  presetId: string;
  /** Wire protocol: "anthropic" or "openai" (-compatible). */
  kind: "anthropic" | "openai";
  baseUrl: string;
  model: string;
  apiKey: string;
  requiresKey: boolean;
}

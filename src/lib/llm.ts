import type { Draft, LLMSettings, Profile } from "../types";
import { companyFromEmail, parseJD } from "./parseJD";
import { RESUME_TEXT } from "./defaultResume";
import { withSignature } from "./signature";

// The signature is appended deterministically after generation, so tell the
// model to stop at the CTA and not invent its own closing.
const NO_SIGNOFF =
  "\n\nEnd the body with the low-pressure CTA. Do NOT add any closing sign-off, sender name, signature, resume link, LinkedIn, or phone number — a fixed signature is appended automatically afterward.";

/** Empty / untouched placeholder => treat as "no resume provided". */
function resumeBlock(): string {
  const text = RESUME_TEXT.trim();
  if (!text || /^paste your resume text here\.?$/i.test(text)) return "";
  return `\n\nThe candidate's full resume:\n"""\n${text}\n"""`;
}

const SYSTEM_PROMPT = `You are a professional email writer helping a software engineer apply for jobs.
Write a concise, confident cold email for a job application.
Rules:
- Max 150 words in the body
- No buzzwords or filler phrases like "I hope this finds you well"
- Mention 2-3 specific, relevant achievements or skills
- End with a simple, low-pressure CTA like "Happy to share more or jump on a quick call"
- Return ONLY a JSON object: { "subject": "...", "body": "..." }
- No markdown, no explanation, just the raw JSON`;

export interface DraftContext {
  company: string | null;
  role: string | null;
}

export interface DraftResult {
  draft: Draft;
  context: DraftContext;
}

export class LLMError extends Error {}

/* ------------------------------------------------------------------ */
/* Prompt assembly (provider-agnostic)                                 */
/* ------------------------------------------------------------------ */

function buildUserMessage(
  profile: Profile,
  recipient: string,
  jd: string,
): { prompt: string; context: DraftContext } {
  const profileLines = [
    `- Name: ${profile.fullName}`,
    `- Current role: ${profile.role}`,
    `- Years of experience: ${profile.yearsExperience}`,
    `- Key skills: ${profile.skills}`,
    profile.bio ? `- Bio: ${profile.bio}` : "",
    profile.resumeUrl ? `- Resume: ${profile.resumeUrl}` : "",
    profile.linkedinUrl ? `- LinkedIn: ${profile.linkedinUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const trimmedJD = jd.trim();
  const resume = resumeBlock();

  if (trimmedJD) {
    const parsed = parseJD(trimmedJD);
    const candidateSkills = profile.skills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const matched = parsed.skills.filter((s) =>
      candidateSkills.some((c) => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c)),
    );

    const prompt = `Here is the candidate's profile:
${profileLines}

The candidate is applying via a job description. Details extracted from it:
- Company: ${parsed.company ?? "unknown"}
- Role: ${parsed.role ?? "unknown"}
- Required skills mentioned: ${parsed.skills.length ? parsed.skills.join(", ") : "none detected"}
- Candidate skills that overlap: ${matched.length ? matched.join(", ") : "none detected"}

Full job description:
"""
${trimmedJD}
"""${resume}

Write a personalized cold application email that references specific requirements from this job description and draws on concrete, relevant achievements from the candidate's resume above. Prefer specifics from the resume over generic claims.${NO_SIGNOFF}`;

    return {
      prompt,
      context: { company: parsed.company ?? companyFromEmail(recipient), role: parsed.role },
    };
  }

  const company = companyFromEmail(recipient);
  const prompt = `Here is the candidate's profile:
${profileLines}

There is no job description. The recipient's email is "${recipient}"${
    company ? `, which suggests the company is "${company}"` : ""
  }.${resume}

Write a strong, generic cold application email using the candidate's profile${
    resume ? " and the concrete achievements from their resume above" : ""
  }.${company ? ` Address it to ${company}.` : ""} Highlight the candidate's most impressive, relevant skills and achievements.${NO_SIGNOFF}`;

  return { prompt, context: { company, role: null } };
}

function extractJSON(raw: string): Draft {
  let text = raw.trim();

  // Defensive: strip ```json ... ``` fences if the model added them.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  // Fall back to the first {...} block if there is surrounding prose.
  if (!text.startsWith("{")) {
    const brace = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (brace !== -1 && end !== -1 && end > brace) {
      text = text.slice(brace, end + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LLMError("The model returned a response that wasn't valid JSON.");
  }

  const obj = parsed as Partial<Draft>;
  if (typeof obj.subject !== "string" || typeof obj.body !== "string") {
    throw new LLMError("The model's response was missing a subject or body.");
  }
  return { subject: obj.subject, body: obj.body };
}

/* ------------------------------------------------------------------ */
/* Transports                                                          */
/* ------------------------------------------------------------------ */

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function safeError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    // Anthropic: { error: { message } }; OpenAI: { error: { message } } too.
    return data?.error?.message ?? data?.message ?? "";
  } catch {
    return "";
  }
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}

async function callAnthropic(s: LLMSettings, system: string, prompt: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(joinUrl(s.baseUrl, "messages"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": s.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: s.model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    throw new LLMError("Network request failed. Check your connection and try again.");
  }

  if (!res.ok) {
    if (res.status === 401) throw new LLMError("Invalid Anthropic API key.");
    if (res.status === 429) throw new LLMError("Rate limited. Wait a moment and retry.");
    throw new LLMError((await safeError(res)) || `Request failed (status ${res.status}).`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new LLMError("The API returned an empty response.");
  return text;
}

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

async function callOpenAI(s: LLMSettings, system: string, prompt: string): Promise<string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (s.apiKey.trim()) headers["authorization"] = `Bearer ${s.apiKey.trim()}`;

  let res: Response;
  try {
    res = await fetch(joinUrl(s.baseUrl, "chat/completions"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: s.model,
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch {
    throw new LLMError(
      "Network request failed. If this is a local server (Ollama / LM Studio), make sure it's running and allows browser requests (see README).",
    );
  }

  if (!res.ok) {
    if (res.status === 401) throw new LLMError("Invalid or missing API key for this provider.");
    if (res.status === 404)
      throw new LLMError(
        `Endpoint or model not found (404). Check the base URL and that the model "${s.model}" exists.`,
      );
    if (res.status === 429) throw new LLMError("Rate limited. Wait a moment and retry.");
    throw new LLMError((await safeError(res)) || `Request failed (status ${res.status}).`);
  }

  const data = (await res.json()) as OpenAIResponse;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new LLMError("The provider returned an empty response.");
  return text;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export async function generateDraft(
  settings: LLMSettings,
  profile: Profile,
  recipient: string,
  jd: string,
): Promise<DraftResult> {
  const { prompt, context } = buildUserMessage(profile, recipient, jd);
  const raw =
    settings.kind === "anthropic"
      ? await callAnthropic(settings, SYSTEM_PROMPT, prompt)
      : await callOpenAI(settings, SYSTEM_PROMPT, prompt);
  const draft = extractJSON(raw);
  // Always end the body with the fixed signature, including the resume link.
  draft.body = withSignature(draft.body, profile.resumeUrl);
  return { draft, context };
}

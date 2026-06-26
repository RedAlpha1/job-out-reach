# Outreach

A lightweight, single-page tool for sending cold job-application emails fast. Paste an
HR email (and optionally a job description), let Claude draft a tight, personalized cold
email, edit it inline, then send via your mail client or copy to the clipboard.

Built for a Senior Android Engineer, but the profile is fully configurable.

- **Stack:** React 18 + TypeScript + Vite, pure CSS (no UI library), `lucide-react` for icons.
- **Backend:** none — everything runs client-side. Your provider settings and profile live
  in `localStorage` and the model API is called directly from the browser.
- **Provider-agnostic:** works with **free / open-source** local models (Ollama, LM Studio,
  llama.cpp, vLLM), **free hosted** options (Groq, OpenRouter), or **Anthropic (Claude)** —
  whatever you prefer. No vendor lock-in.

## Features

- **AI drafting** through your chosen provider. With a JD pasted, it extracts the company,
  role, and required skills, matches them against your profile, and references specific
  requirements. Without a JD, it infers the company from the HR email domain and writes a
  strong generic email.
- **Inline editing** of subject and body, with a live word count (green ≤150, amber
  151–180, red >180).
- **Send** via `mailto:` (opens your default mail client pre-filled) or **Copy** to
  clipboard (`Subject: …` + body).
- **Profile** stored in `localStorage` (`outreach_profile`); editable any time.
- **Application history** (`outreach_history`, last 50) tracking Date / Company / Role /
  Status (Drafted → Copied → Sent).

## Choosing a provider

On first launch the app asks you to pick a provider. Switch any time via the **provider
chip** in the top-right. All settings (provider, base URL, model, key) live only in your
browser under `outreach_llm` and are sent directly to that provider — never to any
intermediate server.

Anything that speaks the OpenAI-compatible `POST {baseURL}/chat/completions` API works,
so the presets below are just shortcuts — pick **Custom** for anything else.

### Free & open-source — fully local (recommended)

**Ollama** (default):
1. Install from <https://ollama.com>.
2. Pull a model: `ollama pull llama3.1` (or `qwen2.5`, `mistral`, …).
3. Make sure it's running (`ollama serve`, or the menu-bar app).
4. In the app pick **Ollama**, base URL `http://localhost:11434/v1`, model `llama3.1`. No key.

> **Browser access (CORS):** because the app runs on `http://localhost:5173` and Ollama on
> `:11434`, you may need to let the browser reach it. Start Ollama with
> `OLLAMA_ORIGINS="*" ollama serve` (or set `OLLAMA_ORIGINS` to `http://localhost:5173`).

**LM Studio:** load a model, start its local server (Developer → Start Server), then pick
**LM Studio** (`http://localhost:1234/v1`). No key. Same CORS note applies — LM Studio
allows CORS by default in recent versions.

### Free — hosted

- **Groq** — fast hosted open-source models on a free tier. Key: <https://console.groq.com/keys>.
  Model e.g. `llama-3.3-70b-versatile`.
- **OpenRouter** — many models; ones ending in `:free` cost nothing (default
  `openai/gpt-oss-120b:free`). Their catalog changes, so if you get a 404
  pick a current id from <https://openrouter.ai/models?max_price=0>.
  Key: <https://openrouter.ai/keys>.

### Paid — highest quality

- **Anthropic (Claude)** — key from <https://console.anthropic.com/settings/keys>
  (starts with `sk-ant-`), model e.g. `claude-sonnet-4-6`.

> Note: for hosted providers the app calls the API straight from the browser (Anthropic
> needs the `anthropic-dangerous-direct-browser-access` header, which is included). This is
> fine for a personal, local tool — but don't deploy it to a shared/public host with your
> key, since anyone using that page would use your key. Local providers (Ollama / LM Studio)
> keep everything on your machine and need no key at all.

## Run locally

Requires Node 18+ (tested on Node 22).

```bash
npm install
npm run dev
```

Open the printed local URL (default <http://localhost:5173>). On first launch you'll be
asked to pick a provider, then to fill in your profile.

### Build for production

```bash
npm run build      # type-checks and bundles to dist/
npm run preview    # serve the production build locally
```

## How it works

1. **Provider + profile** — one-time setup, persisted in `localStorage`.
2. **Input panel** — paste the HR email (required) and optionally the JD.
3. **Draft** — calls your chosen provider with a fixed system prompt that enforces a
   concise (≤150 words), buzzword-free email returning strict JSON `{ subject, body }`.
4. **Review & edit** — tweak subject/body inline; watch the word count.
5. **Send / Copy** — open in your mail client or copy. Either action updates the history
   row's status.

## Project structure

```
src/
  App.tsx              orchestration + modal gating
  main.tsx
  components/          InputPanel, DraftPanel, ProfileModal, ProviderModal, History
  hooks/               useProfile (+ useLLMSettings), useHistory, useDraft
  lib/
    llm.ts             prompt assembly + Anthropic & OpenAI-compatible transports + JSON parsing
    providers.ts       provider presets, settings type, localStorage load/save
    parseJD.ts         company/role/skill extraction from JD text + email domain
    mailto.ts          mailto URL + clipboard text
  types.ts
  styles/global.css
```

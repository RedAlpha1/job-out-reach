/**
 * Fixed email signature appended to the end of every generated draft.
 * Edit the values below to change what's appended. The model is instructed not
 * to add its own sign-off, so this is the single source of truth.
 *
 * The resume URL is taken from your profile (the "Resume URL" field), so it's
 * only included when you've set one.
 */
const NAME = "Prakhar Pandey";
const LINKEDIN = "https://www.linkedin.com/in/prakhar-pandey-59a79616a";
const PHONE = "+91 9599525080";

export function buildSignature(resumeUrl?: string): string {
  const lines = ["Regards,", NAME];
  if (resumeUrl && resumeUrl.trim()) lines.push(`Resume: ${resumeUrl.trim()}`);
  lines.push(LINKEDIN, PHONE);
  return lines.join("\n");
}

/** Append the signature to a body, avoiding a duplicate if it's already there. */
export function withSignature(body: string, resumeUrl?: string): string {
  const sig = buildSignature(resumeUrl);
  const trimmed = body.replace(/\s+$/, "");
  if (trimmed.includes(sig)) return trimmed;
  return `${trimmed}\n\n${sig}`;
}

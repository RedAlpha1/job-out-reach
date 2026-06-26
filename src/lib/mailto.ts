import type { Draft } from "../types";

/**
 * Build a `mailto:` URL from a recipient and a draft. Subject and body are
 * percent-encoded so newlines and special characters survive the handoff to
 * the user's mail client.
 */
export function buildMailto(to: string, draft: Draft): string {
  // The address must stay literal — encoding the "@" (e.g. hr%40razorpay.com)
  // makes some browsers treat the URL as a page and show a blank tab.
  const address = to.trim();

  // Only the subject/body need encoding. URLSearchParams encodes spaces as "+",
  // which mail clients render literally, so normalise those to %20.
  const params = new URLSearchParams();
  params.set("subject", draft.subject);
  params.set("body", draft.body);
  const query = params.toString().replace(/\+/g, "%20");

  return `mailto:${address}?${query}`;
}

/**
 * Open a mailto: URL without unloading the page. Setting
 * `window.location.href` replaces the document (showing a blank page when the
 * OS handoff is slow or no handler is registered); a synthetic anchor click
 * hands the URL to the protocol handler while leaving the app intact.
 */
export function openMailto(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Build a Gmail web "compose" URL. This opens in a browser tab and needs no
 * desktop mail client, so it works even when `mailto:` has no OS handler.
 */
export function buildGmailCompose(to: string, draft: Draft): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: to.trim(),
    su: draft.subject,
    body: draft.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Open a URL in a new tab without giving it access to this window. */
export function openInNewTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** "Subject: ...\n\nBody" — the format used when copying to the clipboard. */
export function draftToClipboardText(draft: Draft): string {
  return `Subject: ${draft.subject}\n\n${draft.body}`;
}

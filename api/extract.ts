/**
 * Vercel serverless function: GET /api/extract?url=<job post url>
 *
 * Browsers can't fetch arbitrary URLs (CORS), so this runs server-side. It
 * downloads the page with a browser-like User-Agent and pulls out:
 *  - text: best-effort job description (OpenGraph description first, since that
 *    is public even on login-walled sites like LinkedIn; falls back to body text)
 *  - email: first email address found in the page, if any
 *  - title / company: from OpenGraph / <title>
 *
 * Note: heavy JS-rendered or strictly login-gated boards may only expose a
 * short OG snippet. That is the best a no-auth fetch can do.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function meta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

function stripToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function findEmail(text: string): string | null {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return null;
  // Skip junk addresses that are almost never the recruiter.
  const bad = /(sentry|example|noreply|no-reply|wixpress|\.png|\.jpg)/i;
  return matches.find((e) => !bad.test(e)) ?? null;
}

export default async function handler(req: any, res: any) {
  const url = (req.query?.url as string) || "";
  if (!/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: "Provide a valid http(s) url." });
    return;
  }

  let html = "";
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      redirect: "follow",
    });
    if (!r.ok) {
      res.status(502).json({ error: `Source returned ${r.status}.` });
      return;
    }
    html = await r.text();
  } catch {
    res.status(502).json({ error: "Could not reach that URL." });
    return;
  }

  const ogDesc = meta(html, "og:description");
  const ogTitle = meta(html, "og:title");
  const company = meta(html, "og:site_name");
  const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const bodyText = stripToText(html).slice(0, 8000);

  // Prefer the OG description (clean, public). Fall back to body text.
  const text = (ogDesc && ogDesc.length > 40 ? ogDesc : bodyText).slice(0, 8000);
  const email = findEmail(html) ?? findEmail(bodyText);

  res.setHeader("cache-control", "s-maxage=600");
  res.status(200).json({
    text,
    email,
    title: ogTitle || decodeEntities(titleTag) || null,
    company: company || null,
  });
}

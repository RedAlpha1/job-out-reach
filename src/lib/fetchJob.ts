export interface JobExtract {
  text: string;
  email: string | null;
  title: string | null;
  company: string | null;
}

/**
 * Ask the serverless function to fetch a job post URL and extract the JD text
 * and any email. Only works when the API route is available (deployed on
 * Vercel, or `vercel dev` locally) — plain `vite dev` has no backend.
 */
export async function extractJob(url: string): Promise<JobExtract> {
  let res: Response;
  try {
    res = await fetch(`/api/extract?url=${encodeURIComponent(url.trim())}`);
  } catch {
    throw new Error("Couldn't reach the fetch service. Are you on the deployed site?");
  }

  if (res.status === 404) {
    throw new Error("Link fetch only works on the deployed site (Vercel), not local vite dev.");
  }
  if (!res.ok) {
    let msg = `Fetch failed (${res.status}).`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

const API = "https://api.github.com";

function headers(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "openhacker-agent",
    "x-github-api-version": "2022-11-28",
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

/** Read a single file's text content. Returns null when the file is absent. */
export async function getFile(
  repo: string,
  path: string,
  ref: string,
  token?: string | null,
): Promise<string | null> {
  const url = `${API}/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, { headers: headers(token) });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub getFile ${repo}/${path}: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return null;
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf8");
  }
  return data.content;
}

export type RepoEntry = { path: string; type: "file" | "dir"; size?: number };

/** List the entries directly under a directory path ("" for the repo root). */
export async function listDir(
  repo: string,
  path: string,
  ref: string,
  token?: string | null,
): Promise<RepoEntry[]> {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const url = `${API}/repos/${repo}/contents/${clean ? `${clean}` : ""}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, { headers: headers(token) });

  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`GitHub listDir ${repo}/${path}: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Array<{ path: string; type: string; size?: number }>;
  if (!Array.isArray(data)) return [];
  return data.map((e) => ({
    path: e.path,
    type: e.type === "dir" ? "dir" : "file",
    size: e.size,
  }));
}

/** Confirm the repo is reachable with the given (optional) token. */
export async function checkRepoAccess(
  repo: string,
  token?: string | null,
): Promise<{ ok: boolean; private?: boolean; defaultBranch?: string; error?: string }> {
  const res = await fetch(`${API}/repos/${repo}`, { headers: headers(token) });
  if (!res.ok) {
    return { ok: false, error: `${res.status} ${res.statusText}` };
  }
  const data = (await res.json()) as { private?: boolean; default_branch?: string };
  return { ok: true, private: data.private, defaultBranch: data.default_branch };
}

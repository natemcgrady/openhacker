import { defineTool } from "eve/tools";
import { z } from "zod";
import { getFile, listDir } from "../lib/github";
import { getStore } from "../lib/store";

export default defineTool({
  description:
    "Read a file or list a directory from a target's repository, for code-level " +
    "vulnerability analysis. Use directory listings to find route handlers, server " +
    "actions, and other trust boundaries, then read those files.",
  inputSchema: z.object({
    targetId: z.string(),
    path: z.string().default("").describe("Repo-relative path. Empty string lists the repo root."),
    mode: z.enum(["file", "list"]).default("file"),
  }),
  async execute({ targetId, path, mode }) {
    const store = getStore();
    const target = await store.getTarget(targetId);
    if (!target) return { ok: false as const, error: "Target not found" };
    const token = await store.getTargetToken(targetId);

    if (mode === "list") {
      const entries = await listDir(target.repo, path, target.branch, token);
      return { ok: true as const, mode, path, entries };
    }

    const content = await getFile(target.repo, path, target.branch, token);
    if (content == null) return { ok: false as const, error: `File not found: ${path}` };
    return { ok: true as const, mode, path, content: content.slice(0, 60_000) };
  },
});

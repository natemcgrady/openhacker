import { createHash } from "node:crypto";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { getStore } from "../lib/store";
import type { Finding } from "../lib/types";

export default defineTool({
  description:
    "Persist a confirmed code-level vulnerability for a target. Only call this when " +
    "you have evidence the issue applies to the target's code. Be honest about proof status. " +
    "Dependency advisories are recorded by run_dependency_scan; use this for code findings.",
  inputSchema: z.object({
    targetId: z.string().describe("The target this finding belongs to."),
    title: z.string().min(1),
    severity: z.enum(["critical", "high", "medium", "low", "info"]),
    category: z.enum(["injection", "authz", "ssrf", "secrets", "xss", "deserialization", "other"]),
    location: z
      .object({
        file: z.string(),
        startLine: z.number().int().optional(),
        endLine: z.number().int().optional(),
        symbol: z.string().optional(),
      })
      .optional(),
    proof: z.object({
      status: z.enum(["proven", "likely", "unconfirmed"]),
      poc: z.string().optional(),
      evidence: z.string().optional(),
    }),
    remediation: z.object({ summary: z.string(), fixedVersion: z.string().optional() }).optional(),
  }),
  async execute(input) {
    const id = createHash("sha256")
      .update(`${input.targetId}::${input.category}::${input.location?.file ?? ""}::${input.title}`.toLowerCase())
      .digest("hex")
      .slice(0, 16);

    const now = new Date().toISOString();
    const store = getStore();
    const existing = (await store.listFindings(input.targetId)).find((f) => f.id === id);

    const finding: Finding = {
      id,
      targetId: input.targetId,
      title: input.title,
      severity: input.severity,
      category: input.category,
      location: input.location,
      proof: input.proof,
      remediation: input.remediation,
      status: existing?.status ?? "open",
      firstSeen: existing?.firstSeen ?? now,
      lastSeen: now,
    };

    await store.upsertFinding(finding);
    return { id, recorded: true };
  },
});

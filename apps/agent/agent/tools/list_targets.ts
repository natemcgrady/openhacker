import { defineTool } from "eve/tools";
import { z } from "zod";
import { getStore } from "../lib/store";

export default defineTool({
  description: "List the repositories (targets) configured for scanning in this OpenHacker instance.",
  inputSchema: z.object({}),
  async execute() {
    const targets = await getStore().listTargets();
    return {
      targets: targets.map((t) => ({
        id: t.id,
        name: t.name,
        repo: t.repo,
        branch: t.branch,
        autoRemediate: t.autoRemediate,
        lastScanAt: t.lastScanAt ?? null,
      })),
    };
  },
});

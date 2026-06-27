import { defineTool } from "eve/tools";
import { z } from "zod";
import { runScan } from "../lib/scan";

export default defineTool({
  description:
    "Run the deterministic dependency vulnerability scan for a target: fetches its " +
    "manifest/lockfile, checks every dependency against OSV, and persists findings. " +
    "Run this first, then reason about which findings are actually reachable.",
  inputSchema: z.object({
    targetId: z.string().describe("The target to scan."),
  }),
  async execute({ targetId }) {
    return runScan(targetId);
  },
});

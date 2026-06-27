import { defineTool } from "eve/tools";
import { z } from "zod";
import { queryOsv } from "../lib/osv";

export default defineTool({
  description:
    "Check a package against the OSV.dev vulnerability database. Returns known " +
    "advisories (CVE/GHSA) affecting the given version. Use this to confirm whether " +
    "a dependency's INSTALLED version is actually vulnerable before reporting it.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Package name, e.g. 'next' or 'lodash'."),
    version: z.string().optional().describe("Installed version, e.g. '14.1.0'."),
    ecosystem: z
      .enum(["npm", "PyPI", "Go", "crates.io", "Maven", "RubyGems", "NuGet"])
      .default("npm"),
  }),
  async execute({ name, version, ecosystem }) {
    const advisories = await queryOsv(name, version, ecosystem);
    return {
      package: name,
      version: version ?? null,
      ecosystem,
      advisoryCount: advisories.length,
      advisories,
    };
  },
});

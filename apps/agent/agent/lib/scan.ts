import { createHash } from "node:crypto";
import { getFile } from "./github";
import { queryOsv, severityFromOsv } from "./osv";
import { getStore } from "./store";
import type { Finding } from "./types";

export type Dependency = { name: string; version: string };

/** Best-effort extraction of resolved dependencies from common manifests/lockfiles. */
export function extractDependencies(files: {
  packageJson?: string | null;
  packageLock?: string | null;
  pnpmLock?: string | null;
}): Dependency[] {
  const found = new Map<string, string>();

  // 1. npm lockfile (exact resolved versions).
  if (files.packageLock) {
    try {
      const lock = JSON.parse(files.packageLock) as {
        packages?: Record<string, { version?: string }>;
        dependencies?: Record<string, { version?: string }>;
      };
      for (const [path, meta] of Object.entries(lock.packages ?? {})) {
        if (!path.startsWith("node_modules/") || !meta.version) continue;
        const name = path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
        found.set(name, meta.version);
      }
      for (const [name, meta] of Object.entries(lock.dependencies ?? {})) {
        if (meta.version && !found.has(name)) found.set(name, meta.version);
      }
    } catch {
      // ignore malformed lockfile
    }
  }

  // 2. pnpm lockfile (regex extraction of resolved package keys).
  if (files.pnpmLock) {
    const re = /^\s{2,}\/?((?:@[^/@\s]+\/)?[^@/\s]+)@(\d+\.\d+\.\d+[^\s:('"]*)/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(files.pnpmLock))) {
      const [, name, version] = m;
      if (!found.has(name)) found.set(name, version);
    }
  }

  // 3. Fall back to package.json ranges (approximate exact version).
  if (files.packageJson) {
    try {
      const pkg = JSON.parse(files.packageJson) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const ranges = { ...pkg.devDependencies, ...pkg.dependencies };
      for (const [name, range] of Object.entries(ranges)) {
        if (found.has(name)) continue;
        const cleaned = range.match(/\d+\.\d+\.\d+[^\s]*/)?.[0];
        if (cleaned) found.set(name, cleaned);
      }
    } catch {
      // ignore malformed manifest
    }
  }

  return [...found.entries()].map(([name, version]) => ({ name, version }));
}

function fingerprint(targetId: string, pkg: string, advisoryId: string): string {
  return createHash("sha256").update(`${targetId}::${pkg}::${advisoryId}`).digest("hex").slice(0, 16);
}

export type ScanResult = {
  ok: boolean;
  dependenciesChecked: number;
  findings: number;
  error?: string;
};

/**
 * Run a dependency vulnerability scan of a target against OSV and persist findings.
 * Deterministic and model-free; the eve agent layers reachability reasoning on top.
 */
export async function runScan(targetId: string): Promise<ScanResult> {
  const store = getStore();
  const target = await store.getTarget(targetId);
  if (!target) return { ok: false, dependenciesChecked: 0, findings: 0, error: "Target not found" };

  const token = await store.getTargetToken(targetId);
  const now = new Date().toISOString();

  try {
    const [packageJson, packageLock, pnpmLock] = await Promise.all([
      getFile(target.repo, "package.json", target.branch, token),
      getFile(target.repo, "package-lock.json", target.branch, token),
      getFile(target.repo, "pnpm-lock.yaml", target.branch, token),
    ]);

    if (!packageJson && !packageLock && !pnpmLock) {
      throw new Error("No package.json or lockfile found at the repo root");
    }

    const deps = extractDependencies({ packageJson, packageLock, pnpmLock });
    const existing = await store.listFindings(targetId);
    const existingById = new Map(existing.map((f) => [f.id, f]));
    const findings: Finding[] = [];

    const results = await Promise.allSettled(
      deps.map(async (dep) => ({ dep, advisories: await queryOsv(dep.name, dep.version) })),
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const { dep, advisories } = r.value;
      for (const adv of advisories) {
        const id = fingerprint(targetId, dep.name, adv.id);
        const prior = existingById.get(id);
        const aliases = adv.aliases.filter((a) => a.startsWith("CVE-"));
        findings.push({
          id,
          targetId,
          title: `${dep.name}@${dep.version}: ${adv.aliases[0] ?? adv.id}`,
          severity: severityFromOsv(adv),
          category: "dependency",
          packageName: dep.name,
          installedVersion: dep.version,
          advisoryIds: [adv.id, ...aliases],
          proof: {
            status: "likely",
            evidence:
              `Installed version ${dep.version} of ${dep.name} is in the affected range of ` +
              `${adv.id}${adv.summary ? `: ${adv.summary}` : ""}.`,
          },
          remediation: adv.fixedIn.length
            ? { summary: `Upgrade ${dep.name} to ${adv.fixedIn[0]} or later.`, fixedVersion: adv.fixedIn[0] }
            : { summary: `Review advisory ${adv.id} and upgrade ${dep.name}.` },
          status: prior?.status ?? "open",
          references: adv.references,
          firstSeen: prior?.firstSeen ?? now,
          lastSeen: now,
        });
      }
    }

    await store.replaceTargetFindings(targetId, findings);
    await store.saveTarget({ ...target, lastScanAt: now, lastScanStatus: "ok", lastScanError: undefined });

    return { ok: true, dependenciesChecked: deps.length, findings: findings.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.saveTarget({ ...target, lastScanAt: now, lastScanStatus: "error", lastScanError: message });
    return { ok: false, dependenciesChecked: 0, findings: 0, error: message };
  }
}

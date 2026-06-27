export type OsvEcosystem =
  | "npm"
  | "PyPI"
  | "Go"
  | "crates.io"
  | "Maven"
  | "RubyGems"
  | "NuGet";

export type Severity = "critical" | "high" | "medium" | "low";

export type OsvAdvisory = {
  id: string;
  aliases: string[];
  summary: string | null;
  cvssVector: string | null;
  qualitative: string | null;
  fixedIn: string[];
  references: string[];
};

type OsvRawVuln = {
  id: string;
  aliases?: string[];
  summary?: string;
  severity?: Array<{ type: string; score: string }>;
  database_specific?: { severity?: string };
  affected?: Array<{ ranges?: Array<{ events?: Array<Record<string, string>> }> }>;
  references?: Array<{ type: string; url: string }>;
};

export async function queryOsv(
  name: string,
  version: string | undefined,
  ecosystem: OsvEcosystem = "npm",
): Promise<OsvAdvisory[]> {
  const body: Record<string, unknown> = { package: { name, ecosystem } };
  if (version) body.version = version;

  const res = await fetch("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OSV query failed for ${name}: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { vulns?: OsvRawVuln[] };

  return (data.vulns ?? []).map((v) => {
    const fixedIn = [
      ...new Set(
        (v.affected ?? [])
          .flatMap((a) => a.ranges ?? [])
          .flatMap((r) => r.events ?? [])
          .map((e) => e.fixed)
          .filter((x): x is string => Boolean(x)),
      ),
    ];

    const cvss = (v.severity ?? []).find((s) => /^CVSS_V3/.test(s.type)) ?? v.severity?.[0];

    return {
      id: v.id,
      aliases: v.aliases ?? [],
      summary: v.summary ?? null,
      cvssVector: cvss?.score ?? null,
      qualitative: v.database_specific?.severity ?? null,
      fixedIn,
      references: (v.references ?? []).map((r) => r.url).slice(0, 5),
    };
  });
}

function bucket(score: number): Severity {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

const QUALITATIVE: Record<string, Severity> = {
  LOW: "low",
  MODERATE: "medium",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/** Severity from OSV: prefer the computed CVSS v3 base score, then the GHSA rating. */
export function severityFromOsv(advisory: OsvAdvisory): Severity {
  if (advisory.cvssVector) {
    const score = cvss3BaseScore(advisory.cvssVector);
    if (score != null) return bucket(score);
  }
  if (advisory.qualitative) {
    const mapped = QUALITATIVE[advisory.qualitative.toUpperCase()];
    if (mapped) return mapped;
  }
  return "medium";
}

// --- Minimal CVSS v3.x base score calculator -------------------------------

const AV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 } as const;
const AC = { L: 0.77, H: 0.44 } as const;
const UI = { N: 0.85, R: 0.62 } as const;
const IMPACT = { H: 0.56, L: 0.22, N: 0 } as const;

function roundUp(n: number): number {
  return Math.ceil(n * 10) / 10;
}

/** Returns the CVSS v3.x base score for a vector string, or null if unparsable. */
export function cvss3BaseScore(vector: string): number | null {
  if (!/^CVSS:3/.test(vector)) return null;
  const parts = Object.fromEntries(
    vector
      .split("/")
      .slice(1)
      .map((p) => p.split(":") as [string, string]),
  );

  const scopeChanged = parts.S === "C";
  const prMap = scopeChanged
    ? { N: 0.85, L: 0.68, H: 0.5 }
    : { N: 0.85, L: 0.62, H: 0.27 };

  const av = AV[parts.AV as keyof typeof AV];
  const ac = AC[parts.AC as keyof typeof AC];
  const pr = prMap[parts.PR as keyof typeof prMap];
  const ui = UI[parts.UI as keyof typeof UI];
  const c = IMPACT[parts.C as keyof typeof IMPACT];
  const i = IMPACT[parts.I as keyof typeof IMPACT];
  const a = IMPACT[parts.A as keyof typeof IMPACT];

  if ([av, ac, pr, ui, c, i, a].some((x) => x == null)) return null;

  const iscBase = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = scopeChanged
    ? 7.52 * (iscBase - 0.029) - 3.25 * (iscBase - 0.02) ** 15
    : 6.42 * iscBase;
  const exploitability = 8.22 * av * ac * pr * ui;

  if (impact <= 0) return 0;
  const raw = scopeChanged
    ? 1.08 * (impact + exploitability)
    : impact + exploitability;
  return roundUp(Math.min(raw, 10));
}

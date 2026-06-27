import type { Finding, Severity } from "@/agent/lib/types";

const ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge sev-${severity}`}>{severity}</span>;
}

export function SeverityCounts({ findings }: { findings: Finding[] }) {
  const open = findings.filter((f) => f.status === "open" || f.status === "triaged");
  const counts = ORDER.map((sev) => ({
    sev,
    n: open.filter((f) => f.severity === sev).length,
  })).filter((c) => c.n > 0);

  if (counts.length === 0) {
    return <span className="mono-sm">no open findings</span>;
  }

  return (
    <span className="counts">
      {counts.map((c) => (
        <span key={c.sev} className={`badge sev-${c.sev}`}>
          {c.n} {c.sev}
        </span>
      ))}
    </span>
  );
}

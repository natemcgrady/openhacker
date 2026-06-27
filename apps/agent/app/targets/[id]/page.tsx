import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/agent/lib/store";
import type { Severity } from "@/agent/lib/types";
import { SeverityBadge } from "../../_components/ui";
import { deleteTarget, scanTarget, setFindingStatus } from "../../actions";

export const dynamic = "force-dynamic";

const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const STATUSES = ["open", "triaged", "fixed", "ignored", "false_positive"] as const;

export default async function TargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const target = await store.getTarget(id);
  if (!target) notFound();

  const findings = (await store.listFindings(id)).sort(
    (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.title.localeCompare(b.title),
  );

  return (
    <main className="container">
      <p className="mono-sm">
        <Link href="/">← Targets</Link>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="grow" style={{ flex: 1 }}>
          <h1>{target.name}</h1>
          <p className="sub">
            {target.repo}@{target.branch}
            {target.autoRemediate ? " · auto-remediate on" : ""}
            {target.lastScanAt ? ` · last scan ${new Date(target.lastScanAt).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="actions">
          <form action={scanTarget} className="inline">
            <input type="hidden" name="id" value={target.id} />
            <button type="submit">Scan now</button>
          </form>
          <form action={deleteTarget} className="inline">
            <input type="hidden" name="id" value={target.id} />
            <button type="submit" className="btn-danger">
              Delete
            </button>
          </form>
        </div>
      </div>

      {target.lastScanStatus === "error" ? (
        <div className="banner">Last scan failed: {target.lastScanError}</div>
      ) : null}

      <h2>Findings ({findings.length})</h2>
      {findings.length === 0 ? (
        <div className="empty">
          No findings recorded yet. Run a scan to check this repository&apos;s dependencies.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Finding</th>
              <th>Advisory</th>
              <th>Remediation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id}>
                <td>
                  <SeverityBadge severity={f.severity} />
                </td>
                <td>
                  <div>{f.title}</div>
                  {f.proof.evidence ? <div className="mono-sm">{f.proof.evidence}</div> : null}
                  <div className="mono-sm">
                    {f.category}
                    {f.location ? ` · ${f.location.file}` : ""} · proof: {f.proof.status}
                  </div>
                </td>
                <td className="mono-sm">
                  {(f.advisoryIds ?? []).map((a, i) => (
                    <div key={a}>
                      {f.references?.[i] ? (
                        <a href={f.references[i]} target="_blank" rel="noreferrer">
                          {a}
                        </a>
                      ) : (
                        a
                      )}
                    </div>
                  ))}
                </td>
                <td className="mono-sm">
                  {f.remediation?.summary}
                  {f.remediation?.fixedVersion ? (
                    <div>→ {f.remediation.fixedVersion}</div>
                  ) : null}
                </td>
                <td>
                  <form action={setFindingStatus} className="actions">
                    <input type="hidden" name="targetId" value={target.id} />
                    <input type="hidden" name="findingId" value={f.id} />
                    <select name="status" defaultValue={f.status}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-ghost">
                      Set
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

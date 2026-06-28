import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { finding, project, report, scanRun } from "./db/app-schema";
import { db } from "./db";

type NormalizedFinding = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string | null;
  remediation: string | null;
  packageName: string | null;
  packageVersion: string | null;
  advisoryId: string | null;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  fingerprint: string;
};

type StoreScanRunResultInput = {
  readonly claimedByTokenId: string;
  readonly organizationId: string;
  readonly payload: Record<string, unknown>;
  readonly runId: string;
};

type MarkScanRunFailedInput = {
  readonly claimedByTokenId: string;
  readonly error: unknown;
  readonly organizationId: string;
  readonly runId: string;
};

export type ScanRunResultPersistenceResult =
  | {
      readonly ok: true;
      readonly findingsAccepted: number;
      readonly report: typeof report.$inferSelect;
    }
  | { readonly ok: false; readonly error: string; readonly status: number };

const SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

export async function storeScanRunResult({
  claimedByTokenId,
  organizationId,
  payload,
  runId,
}: StoreScanRunResultInput): Promise<ScanRunResultPersistenceResult> {
  const markdown = normalizeString(payload.markdown ?? payload.report ?? "");

  if (!markdown) {
    return { ok: false, error: "Report markdown is required.", status: 400 };
  }

  const [runRecord] = await db
    .select({
      run: scanRun,
      project,
    })
    .from(scanRun)
    .innerJoin(project, eq(scanRun.projectId, project.id))
    .where(and(eq(scanRun.id, runId), eq(scanRun.organizationId, organizationId)))
    .limit(1);

  if (!runRecord) {
    return { ok: false, error: "Run not found.", status: 404 };
  }

  if (runRecord.run.claimedByTokenId !== claimedByTokenId) {
    return {
      ok: false,
      error: "This run was not claimed by the current agent registration.",
      status: 403,
    };
  }

  if (runRecord.run.status === "completed") {
    return {
      ok: false,
      error: "This run has already been completed.",
      status: 409,
    };
  }

  if (runRecord.run.status !== "running") {
    return {
      ok: false,
      error: "Only running scans can receive results.",
      status: 409,
    };
  }

  const findings = normalizeFindings(payload.findings);
  const counts = countSeverities(findings);
  const reportId = randomUUID();
  const title =
    normalizeString(payload.title) || `Security report for ${runRecord.project.fullName}`;
  const summary =
    normalizeString(payload.summary) || markdown.replace(/\s+/g, " ").slice(0, 240);

  const [createdReport] = await db
    .insert(report)
    .values({
      id: reportId,
      organizationId,
      projectId: runRecord.project.id,
      scanRunId: runRecord.run.id,
      title,
      summary,
      content: markdown,
      criticalCount: counts.critical,
      highCount: counts.high,
      mediumCount: counts.medium,
      lowCount: counts.low,
      infoCount: counts.info,
    })
    .returning();

  if (findings.length > 0) {
    await db
      .insert(finding)
      .values(
        findings.map((item) => ({
          id: randomUUID(),
          organizationId,
          projectId: runRecord.project.id,
          scanRunId: runRecord.run.id,
          reportId: createdReport.id,
          severity: item.severity,
          title: item.title,
          description: item.description,
          remediation: item.remediation,
          packageName: item.packageName,
          packageVersion: item.packageVersion,
          advisoryId: item.advisoryId,
          filePath: item.filePath,
          lineStart: item.lineStart,
          lineEnd: item.lineEnd,
          fingerprint: item.fingerprint,
        })),
      )
      .onConflictDoNothing();
  }

  await db
    .update(scanRun)
    .set({
      status: "completed",
      completedAt: new Date(),
      errorMessage: null,
      eveSessionId: normalizeString(payload.eveSessionId) || null,
    })
    .where(
      and(
        eq(scanRun.id, runRecord.run.id),
        eq(scanRun.status, "running"),
        eq(scanRun.claimedByTokenId, claimedByTokenId),
      ),
    );

  return {
    ok: true,
    report: createdReport,
    findingsAccepted: findings.length,
  };
}

export async function markScanRunFailed({
  claimedByTokenId,
  error,
  organizationId,
  runId,
}: MarkScanRunFailedInput) {
  const message = formatError(error).slice(0, 1000);

  const [updatedRun] = await db
    .update(scanRun)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: message || "The agent could not complete this run.",
    })
    .where(
      and(
        eq(scanRun.id, runId),
        eq(scanRun.organizationId, organizationId),
        eq(scanRun.status, "running"),
        eq(scanRun.claimedByTokenId, claimedByTokenId),
      ),
    )
    .returning();

  return updatedRun;
}

function normalizeFindings(value: unknown): NormalizedFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeFinding(item))
    .filter((item): item is NormalizedFinding => item !== null)
    .slice(0, 100);
}

function normalizeFinding(value: unknown): NormalizedFinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = normalizeString(record.title).slice(0, 240);

  if (!title) {
    return null;
  }

  const severity = normalizeSeverity(record.severity);
  const description = nullableString(record.description);
  const remediation = nullableString(record.remediation ?? record.recommendation);
  const packageName = nullableString(record.packageName ?? record.package);
  const packageVersion = nullableString(record.packageVersion ?? record.version);
  const advisoryId = nullableString(record.advisoryId ?? record.cve ?? record.ghsa);
  const filePath = nullableString(record.filePath ?? record.path);
  const lineStart = nullableInteger(record.lineStart ?? record.line);
  const lineEnd = nullableInteger(record.lineEnd);
  const providedFingerprint = nullableString(record.fingerprint);

  return {
    severity,
    title,
    description,
    remediation,
    packageName,
    packageVersion,
    advisoryId,
    filePath,
    lineStart,
    lineEnd,
    fingerprint:
      providedFingerprint ??
      createFindingFingerprint({
        severity,
        title,
        advisoryId,
        filePath,
        packageName,
      }),
  };
}

function normalizeSeverity(value: unknown): NormalizedFinding["severity"] {
  const severity = normalizeString(value).toLowerCase();

  if (SEVERITIES.has(severity)) {
    return severity as NormalizedFinding["severity"];
  }

  return "info";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized ? normalized.slice(0, 1000) : null;
}

function nullableInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}

function createFindingFingerprint(parts: Record<string, string | null>) {
  return createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 32);
}

function countSeverities(findings: readonly NormalizedFinding[]) {
  return findings.reduce(
    (counts, item) => {
      counts[item.severity] += 1;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  );
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

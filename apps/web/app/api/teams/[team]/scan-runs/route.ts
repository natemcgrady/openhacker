import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  AgentDeliveryError,
  deliverScanToAgent,
} from "../../../../../lib/agent-delivery";
import { agentToken, scanRun } from "../../../../../lib/db/app-schema";
import { db } from "../../../../../lib/db";
import { ensureProject } from "../../../../../lib/projects";
import { validateGitHubRepository } from "../../../../../lib/repository";
import {
  markScanRunFailed,
  storeScanRunResult,
} from "../../../../../lib/scan-run-results";
import { getTeamRouteContext } from "../../../../../lib/team";

type RouteContext = {
  params: Promise<{
    team: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { team } = await context.params;
  const teamContext = await getTeamRouteContext(team, request.headers);

  if (!teamContext) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const repositoryInput = typeof body?.repository === "string" ? body.repository : "";
  const validation = validateGitHubRepository(repositoryInput);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const [activeAgent] = await db
    .select()
    .from(agentToken)
    .where(
      and(
        eq(agentToken.organizationId, teamContext.organization.id),
        isNull(agentToken.revokedAt),
      ),
    )
    .limit(1);

  const agentChannelUrl = activeAgent?.agentChannelUrl;

  if (!activeAgent || !agentChannelUrl) {
    return NextResponse.json(
      { error: "Configure the deployed agent channel before running scans." },
      { status: 409 },
    );
  }

  const connectedProject = await ensureProject(
    teamContext.organization.id,
    validation,
  );

  const [createdRun] = await db
    .insert(scanRun)
    .values({
      id: randomUUID(),
      organizationId: teamContext.organization.id,
      projectId: connectedProject.id,
      status: "running",
      trigger: "manual",
      requestedByUserId: teamContext.session.user.id,
      claimedByTokenId: activeAgent.id,
      claimedAt: new Date(),
    })
    .returning();

  let agentResult: Record<string, unknown>;

  try {
    agentResult = await deliverScanToAgent(agentChannelUrl, {
      runId: createdRun.id,
      repository: validation.repository,
    });
  } catch (error) {
    await markScanRunFailed({
      claimedByTokenId: activeAgent.id,
      error,
      organizationId: teamContext.organization.id,
      runId: createdRun.id,
    });

    return NextResponse.json(
      { error: formatError(error) },
      { status: error instanceof AgentDeliveryError ? error.status : 502 },
    );
  }

  const storedResult = await storeScanRunResult({
    claimedByTokenId: activeAgent.id,
    organizationId: teamContext.organization.id,
    payload: agentResult,
    runId: createdRun.id,
  });

  if (!storedResult.ok) {
    await markScanRunFailed({
      claimedByTokenId: activeAgent.id,
      error: storedResult.error,
      organizationId: teamContext.organization.id,
      runId: createdRun.id,
    });

    return NextResponse.json(
      { error: storedResult.error },
      { status: storedResult.status },
    );
  }

  return NextResponse.json(
    {
      run: createdRun,
      project: connectedProject,
      report: storedResult.report,
      findingsAccepted: storedResult.findingsAccepted,
    },
    { status: 201 },
  );
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

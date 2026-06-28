import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticateAgentRequest } from "../../../../../../lib/agent-auth";
import { project, scanRun } from "../../../../../../lib/db/app-schema";
import { db } from "../../../../../../lib/db";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const token = await authenticateAgentRequest(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { runId } = await context.params;
  const [candidate] = await db
    .select({
      run: scanRun,
      project,
    })
    .from(scanRun)
    .innerJoin(project, eq(scanRun.projectId, project.id))
    .where(
      and(eq(scanRun.id, runId), eq(scanRun.organizationId, token.organizationId)),
    )
    .limit(1);

  if (!candidate) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (
    candidate.run.status === "running" &&
    candidate.run.claimedByTokenId === token.id
  ) {
    return NextResponse.json(toClaimedRun(candidate.run, candidate.project));
  }

  if (candidate.run.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending scans can be claimed." },
      { status: 409 },
    );
  }

  const [claimedRun] = await db
    .update(scanRun)
    .set({
      status: "running",
      claimedAt: new Date(),
      claimedByTokenId: token.id,
    })
    .where(
      and(
        eq(scanRun.id, candidate.run.id),
        eq(scanRun.organizationId, token.organizationId),
        eq(scanRun.status, "pending"),
      ),
    )
    .returning();

  if (!claimedRun) {
    return NextResponse.json(
      { error: "This scan was already claimed." },
      { status: 409 },
    );
  }

  return NextResponse.json(toClaimedRun(claimedRun, candidate.project));
}

function toClaimedRun(
  run: typeof scanRun.$inferSelect,
  runProject: typeof project.$inferSelect,
) {
  return {
    run: {
      id: run.id,
      repository: runProject.fullName,
      requestedAt: run.requestedAt,
    },
    project: {
      id: runProject.id,
      fullName: runProject.fullName,
      url: runProject.url,
    },
  };
}

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createAgentTokenSecret } from "../../../../../lib/agent-auth";
import { agentToken } from "../../../../../lib/db/app-schema";
import { db } from "../../../../../lib/db";
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
  const channelUrl = normalizeAgentChannelUrl(body?.agentChannelUrl);

  if (!channelUrl.ok) {
    return NextResponse.json({ error: channelUrl.error }, { status: 400 });
  }

  const label = "Team agent";
  const { secret, hash } = createAgentTokenSecret();

  const [existingToken] = await db
    .select()
    .from(agentToken)
    .where(
      and(
        eq(agentToken.organizationId, teamContext.organization.id),
        isNull(agentToken.revokedAt),
      ),
    )
    .limit(1);

  const [savedToken] = existingToken
    ? await db
        .update(agentToken)
        .set({
          label,
          tokenHash: hash,
          agentChannelUrl: channelUrl.url,
          createdByUserId: teamContext.session.user.id,
          createdAt: new Date(),
          lastUsedAt: null,
        })
        .where(eq(agentToken.id, existingToken.id))
        .returning()
    : await db
        .insert(agentToken)
        .values({
          id: randomUUID(),
          organizationId: teamContext.organization.id,
          label,
          tokenHash: hash,
          agentChannelUrl: channelUrl.url,
          createdByUserId: teamContext.session.user.id,
        })
        .returning();

  return NextResponse.json(
    {
      token: secret,
      id: savedToken.id,
      label: savedToken.label,
      agentChannelUrl: savedToken.agentChannelUrl,
    },
    { status: 201 },
  );
}

function normalizeAgentChannelUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false as const, error: "Enter the deployed agent channel URL." };
  }

  try {
    const url = new URL(value.trim());

    if (url.username || url.password || url.search || url.hash) {
      return {
        ok: false as const,
        error: "Agent channel URL cannot include credentials, query, or hash.",
      };
    }

    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
      return {
        ok: false as const,
        error: "Agent channel URL must use HTTPS in production.",
      };
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false as const, error: "Agent channel URL must be HTTP or HTTPS." };
    }

    url.pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (url.pathname !== "/channels/openhacker") {
      return {
        ok: false as const,
        error: "Agent channel URL must end with /channels/openhacker.",
      };
    }

    return { ok: true as const, url: url.toString().replace(/\/$/, "") };
  } catch {
    return { ok: false as const, error: "Enter a valid agent channel URL." };
  }
}

import { timingSafeEqual } from "node:crypto";
import { defineChannel, POST, WS, type RouteHandlerArgs } from "eve/channels";
import type { HandleMessageStreamEvent } from "eve/client";
import {
  claimRun,
  formatError,
  getOpenHackerToken,
  postRunFailure,
  postRunResult,
} from "../platform";
import {
  buildScanPrompt,
  normalizeScanResult,
  SCAN_OUTPUT_SCHEMA,
} from "../run-platform-scan";

type OpenHackerChannelState = {
  readonly runId: string | null;
  readonly repository: string | null;
  readonly projectFullName: string | null;
};

type OpenHackerRunPayload = {
  readonly runId?: string;
  readonly instructions?: string;
  readonly message?: string;
};

type OpenHackerAuth = {
  readonly attributes: Record<string, string>;
  readonly authenticator: "openhacker";
  readonly principalId: "openhacker-platform";
  readonly principalType: "service";
};

type StartRunInput = {
  readonly runId: string;
  readonly instructions?: string;
  readonly message?: string;
};

export default defineChannel<
  OpenHackerChannelState,
  void,
  Record<string, never>,
  {
    readonly runId: string | null;
    readonly repository: string | null;
    readonly projectFullName: string | null;
  }
>({
  state: {
    runId: null,
    repository: null,
    projectFullName: null,
  },
  metadata(state) {
    return {
      runId: state.runId,
      repository: state.repository,
      projectFullName: state.projectFullName,
    };
  },
  routes: [
    POST("/runs/:runId", async (request, args) => {
      const auth = await authenticateOpenHackerRequest(request);

      if (auth instanceof Response) {
        return auth;
      }

      const payload = await readJsonPayload(request);
      const started = await startRun(args, auth, {
        runId: args.params.runId,
        instructions: normalizeString(payload?.instructions),
        message: normalizeString(payload?.message),
      });

      if (!started.ok) {
        return Response.json({ error: started.error }, { status: started.status });
      }

      return Response.json({
        runId: started.runId,
        repository: started.repository,
        sessionId: started.sessionId,
        continuationToken: started.continuationToken,
      });
    }),
    WS("/runs/ws", (_request, args) => {
      let auth: OpenHackerAuth | null = null;

      return {
        async upgrade(request) {
          const result = await authenticateOpenHackerRequest(request);

          if (result instanceof Response) {
            return result;
          }

          auth = result;
        },
        open(peer) {
          peer.send({ type: "ready" });
        },
        async message(peer, message) {
          if (!auth) {
            peer.close(1008, "Unauthorized.");
            return;
          }

          const payload = parseWebSocketPayload(message);

          if (!payload.runId) {
            peer.send({ type: "error", error: "runId is required." });
            return;
          }

          const started = await startRun(args, auth, payload);

          if (!started.ok) {
            peer.send({
              type: "error",
              runId: payload.runId,
              error: started.error,
            });
            return;
          }

          peer.send({
            type: "started",
            runId: started.runId,
            repository: started.repository,
            sessionId: started.sessionId,
            continuationToken: started.continuationToken,
          });
        },
      };
    }),
  ],
});

async function startRun(
  args: RouteHandlerArgs<OpenHackerChannelState>,
  auth: OpenHackerAuth,
  input: StartRunInput,
) {
  const claimed = await claimRun(input.runId);

  if (!claimed.ok) {
    return {
      ok: false as const,
      status: claimed.skipped ? 503 : 502,
      error: claimed.error,
    };
  }

  const repository = claimed.run.project.fullName;
  const message =
    input.message || buildOpenHackerPrompt(repository, input.instructions);

  try {
    const session = await args.send(
      {
        message,
        outputSchema: SCAN_OUTPUT_SCHEMA,
      },
      {
        auth,
        continuationToken: input.runId,
        mode: "task",
        title: `OpenHacker scan ${repository}`,
        state: {
          runId: input.runId,
          repository,
          projectFullName: claimed.run.project.fullName,
        },
      },
    );

    args.waitUntil(reportSessionResult(input.runId, repository, session));

    return {
      ok: true as const,
      runId: input.runId,
      repository,
      sessionId: session.id,
      continuationToken: session.continuationToken,
    };
  } catch (error) {
    await postRunFailure(input.runId, error);

    return {
      ok: false as const,
      status: 500,
      error: formatError(error),
    };
  }
}

async function reportSessionResult(
  runId: string,
  repository: string,
  session: Awaited<ReturnType<RouteHandlerArgs<OpenHackerChannelState>["send"]>>,
) {
  try {
    const { message, result } = await readTerminalResult(session);
    await postRunResult(
      runId,
      normalizeScanResult(result, message, repository, session.id),
    );
  } catch (error) {
    await postRunFailure(runId, error);
  }
}

async function readTerminalResult(
  session: Awaited<ReturnType<RouteHandlerArgs<OpenHackerChannelState>["send"]>>,
) {
  const stream = await session.getEventStream();
  const reader = stream.getReader();
  let message: string | null = null;
  let result: unknown = null;

  try {
    while (true) {
      const chunk = await reader.read();

      if (chunk.done) {
        break;
      }

      const event = chunk.value as HandleMessageStreamEvent;

      if (event.type === "message.completed" && event.data.message) {
        message = event.data.message;
      }

      if (event.type === "result.completed") {
        result = event.data.result;
      }

      if (
        event.type === "session.failed" ||
        event.type === "turn.failed" ||
        event.type === "step.failed"
      ) {
        throw new Error(event.data.message);
      }

      if (event.type === "session.completed") {
        return { message, result };
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { message, result };
}

async function authenticateOpenHackerRequest(request: Request) {
  const bearerToken = readBearerToken(request);

  if (!bearerToken) {
    return unauthorizedResponse();
  }

  const expectedToken = await getOpenHackerToken();

  if (!expectedToken.ok) {
    return Response.json({ error: expectedToken.error }, { status: 503 });
  }

  if (!safeTokenEquals(bearerToken, expectedToken.token)) {
    return unauthorizedResponse();
  }

  return {
    authenticator: "openhacker",
    principalType: "service",
    principalId: "openhacker-platform",
    attributes: {
      connector: "custom/openhacker",
    },
  } satisfies OpenHackerAuth;
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function safeTokenEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

async function readJsonPayload(request: Request) {
  return (await request.json().catch(() => null)) as OpenHackerRunPayload | null;
}

function parseWebSocketPayload(message: {
  json<T = unknown>(): T;
}): StartRunInput {
  let value: unknown;

  try {
    value = message.json();
  } catch {
    return { runId: "" };
  }

  if (!value || typeof value !== "object") {
    return { runId: "" };
  }

  const record = value as Record<string, unknown>;

  return {
    runId: normalizeString(record.runId),
    instructions: normalizeString(record.instructions),
    message: normalizeString(record.message),
  };
}

function buildOpenHackerPrompt(repository: string, instructions?: string) {
  if (!instructions) {
    return buildScanPrompt(repository);
  }

  return `${buildScanPrompt(repository)}\n\nAdditional OpenHacker instructions:\n${instructions}`;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

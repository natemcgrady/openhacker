import { defineChannel, POST, type RouteHandlerArgs } from "eve/channels";
import type { HandleMessageStreamEvent } from "eve/client";

type OpenHackerChannelState = {
  readonly runId: string | null;
  readonly repository: string | null;
  readonly projectFullName: string | null;
};

type OpenHackerRunPayload = {
  readonly runId?: string;
  readonly repository?: string;
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
  readonly repository: string;
  readonly instructions?: string;
  readonly message?: string;
};

type StructuredFinding = {
  readonly severity?: string;
  readonly title?: string;
  readonly description?: string;
  readonly remediation?: string;
  readonly packageName?: string;
  readonly packageVersion?: string;
  readonly advisoryId?: string;
  readonly filePath?: string;
  readonly lineStart?: number;
  readonly lineEnd?: number;
  readonly fingerprint?: string;
};

type ScanResult = {
  readonly markdown: string;
  readonly findings: readonly StructuredFinding[];
  readonly title?: string;
  readonly summary?: string;
  readonly eveSessionId?: string;
};

type EveScanOutput = {
  readonly title?: string;
  readonly summary?: string;
  readonly markdown?: string;
  readonly findings?: readonly StructuredFinding[];
};

const OPENHACKER_AUTH = {
  authenticator: "openhacker",
  principalType: "service",
  principalId: "openhacker-platform",
  attributes: {
    channel: "openhacker",
  },
} satisfies OpenHackerAuth;

const SCAN_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    markdown: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low", "info"],
          },
          title: { type: "string" },
          description: { type: "string" },
          remediation: { type: "string" },
          packageName: { type: "string" },
          packageVersion: { type: "string" },
          advisoryId: { type: "string" },
          filePath: { type: "string" },
          lineStart: { type: "number" },
          lineEnd: { type: "number" },
          fingerprint: { type: "string" },
        },
        required: ["severity", "title", "description", "remediation"],
      },
    },
  },
  required: ["title", "summary", "markdown", "findings"],
} as const;

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
    POST("/channels/openhacker", async (request, args) => {
      const payload = await readJsonPayload(request);
      const runId = normalizeString(payload?.runId);
      const repository = normalizeString(payload?.repository);

      if (!runId) {
        return Response.json({ error: "runId is required." }, { status: 400 });
      }

      if (!repository) {
        return Response.json({ error: "repository is required." }, { status: 400 });
      }

      const result = await runScan(args, {
        runId,
        repository,
        instructions: normalizeString(payload?.instructions),
        message: normalizeString(payload?.message),
      });

      if (!result.ok) {
        return Response.json({ error: result.error }, { status: result.status });
      }

      return Response.json(result.payload);
    }),
  ],
});

async function runScan(
  args: RouteHandlerArgs<OpenHackerChannelState>,
  input: StartRunInput,
) {
  const message =
    input.message || buildOpenHackerPrompt(input.repository, input.instructions);

  try {
    const session = await args.send(
      {
        message,
        outputSchema: SCAN_OUTPUT_SCHEMA,
      },
      {
        auth: OPENHACKER_AUTH,
        continuationToken: input.runId,
        mode: "task",
        title: `OpenHacker scan ${input.repository}`,
        state: {
          runId: input.runId,
          repository: input.repository,
          projectFullName: input.repository,
        },
      },
    );

    const { message: resultMessage, result } = await readTerminalResult(session);

    return {
      ok: true as const,
      payload: {
        runId: input.runId,
        repository: input.repository,
        ...normalizeScanResult(
          result,
          resultMessage,
          input.repository,
          session.id,
        ),
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 500,
      error: formatError(error),
    };
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

async function readJsonPayload(request: Request) {
  return (await request.json().catch(() => null)) as OpenHackerRunPayload | null;
}

function buildOpenHackerPrompt(repository: string, instructions?: string) {
  if (!instructions) {
    return buildScanPrompt(repository);
  }

  return `${buildScanPrompt(repository)}\n\nAdditional OpenHacker instructions:\n${instructions}`;
}

function buildScanPrompt(repository: string) {
  return [
    `Analyze the GitHub repository ${repository} for security vulnerabilities.`,
    "Return a concise human-readable markdown report.",
    "Also satisfy the requested structured output schema with the same findings.",
    "Use severity values critical, high, medium, low, or info.",
  ].join("\n");
}

function normalizeScanResult(
  data: unknown,
  message: string | null | undefined,
  repository: string,
  eveSessionId?: string,
): ScanResult {
  const output = isEveScanOutput(data) ? data : null;
  const markdown = normalizeString(output?.markdown) || message || "";

  if (!markdown.trim()) {
    throw new Error("Eve did not return a report.");
  }

  const outputFindings = output?.findings;
  const findings =
    Array.isArray(outputFindings) && outputFindings.length > 0
      ? outputFindings
      : extractStructuredFindings(markdown);

  return {
    markdown,
    findings,
    title:
      normalizeString(output?.title) ||
      `Security report for ${repository}`,
    summary:
      normalizeString(output?.summary) ||
      markdown.replace(/\s+/g, " ").slice(0, 240),
    eveSessionId,
  };
}

function extractStructuredFindings(markdown: string): StructuredFinding[] {
  for (const match of markdown.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    try {
      const parsed = JSON.parse(match[1]?.trim() ?? "") as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { findings?: unknown }).findings)
      ) {
        return (parsed as { findings: StructuredFinding[] }).findings;
      }
    } catch {
      continue;
    }
  }

  return [];
}

function isEveScanOutput(value: unknown): value is EveScanOutput {
  return !!value && typeof value === "object";
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export type AgentScanRequest = {
  readonly repository: string;
  readonly runId: string;
};

export type AgentScanResult = {
  readonly markdown?: unknown;
  readonly report?: unknown;
  readonly findings?: unknown;
  readonly title?: unknown;
  readonly summary?: unknown;
  readonly eveSessionId?: unknown;
};

export class AgentDeliveryError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AgentDeliveryError";
    this.status = status;
  }
}

export async function deliverScanToAgent(
  agentChannelUrl: string,
  request: AgentScanRequest,
) {
  let response: Response;

  try {
    response = await fetch(agentChannelUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(290_000),
    });
  } catch (error) {
    throw new AgentDeliveryError(
      `Could not reach the deployed agent: ${formatError(error)}`,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | AgentScanResult
    | { error?: unknown }
    | null;

  if (!response.ok) {
    throw new AgentDeliveryError(
      readPayloadError(payload, "The deployed agent rejected the scan request."),
      response.status,
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new AgentDeliveryError("The deployed agent did not return a scan result.");
  }

  return payload as AgentScanResult;
}

function readPayloadError(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

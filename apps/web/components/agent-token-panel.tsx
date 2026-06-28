"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AgentTokenPanelProps = {
  readonly hasAgent: boolean;
  readonly team: string;
};

export function AgentTokenPanel({ hasAgent, team }: AgentTokenPanelProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasCopiedEnv, setHasCopiedEnv] = useState(false);

  async function onSubmit() {
    setError(null);
    setIsGenerating(true);
    setHasCopiedEnv(false);

    const response = await fetch(`/api/teams/${team}/agent-tokens`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => null);
    setIsGenerating(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not create an agent token.");
      return;
    }

    setToken(payload.token);
  }

  const envSnippet = token ? `OPENHACKER_TOKEN=${token}` : "";

  async function copyEnvSnippet() {
    if (!envSnippet || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(envSnippet);
    setHasCopiedEnv(true);
  }

  function continueToDashboard() {
    router.refresh();
  }

  return (
    <div className="agent-token-panel">
      <p className="muted">
        {hasAgent
          ? "This team already has an agent. Generating a new token rotates the existing agent token."
          : "Generate one token for the headless Eve agent deployed for this team."}
      </p>
      <form action={onSubmit} className="token-form">
        <button className="button" disabled={isGenerating} type="submit">
          {isGenerating
            ? "Generating..."
            : hasAgent
              ? "Rotate agent token"
              : "Generate agent token"}
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      {token ? (
        <div className="token-reveal">
          <p className="eyebrow">Shown once</p>
          <input aria-label="Agent token" readOnly value={token} />
          <pre className="env-snippet">{envSnippet}</pre>
          <button className="button" onClick={copyEnvSnippet} type="button">
            {hasCopiedEnv ? "Copied env var" : "Copy Vercel env var"}
          </button>
          {hasCopiedEnv ? (
            <button
              className="button primary"
              onClick={continueToDashboard}
              type="button"
            >
              Continue to dashboard
            </button>
          ) : null}
          <p className="muted">
            Add this environment variable to the Vercel project created by{" "}
            <strong>npx openhacker</strong>. The deployed headless agent will
            poll this platform for queued scans and publish results back to this
            team.
          </p>
        </div>
      ) : null}
    </div>
  );
}

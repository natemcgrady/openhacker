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
  const [hasCopiedCredential, setHasCopiedCredential] = useState(false);

  async function onSubmit() {
    setError(null);
    setIsGenerating(true);
    setHasCopiedCredential(false);

    const response = await fetch(`/api/teams/${team}/agent-tokens`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => null);
    setIsGenerating(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not create a connector credential.");
      return;
    }

    setToken(payload.token);
  }

  async function copyCredential() {
    if (!token || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(token);
    setHasCopiedCredential(true);
  }

  function continueToDashboard() {
    router.refresh();
  }

  return (
    <div className="agent-token-panel">
      <p className="muted">
        {hasAgent
          ? "This team already has an agent connector credential. Generating a new credential rotates the existing one."
          : "Generate one credential for the OpenHacker Vercel Connect connector."}
      </p>
      <form action={onSubmit} className="token-form">
        <button className="button" disabled={isGenerating} type="submit">
          {isGenerating
            ? "Generating..."
            : hasAgent
              ? "Rotate connector credential"
              : "Generate connector credential"}
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      {token ? (
        <div className="token-reveal">
          <p className="eyebrow">Shown once</p>
          <input aria-label="Connector credential" readOnly value={token} />
          <button className="button" onClick={copyCredential} type="button">
            {hasCopiedCredential ? "Copied credential" : "Copy connector credential"}
          </button>
          {hasCopiedCredential ? (
            <button
              className="button primary"
              onClick={continueToDashboard}
              type="button"
            >
              Continue to dashboard
            </button>
          ) : null}
          <p className="muted">
            Store this credential in the project-linked Vercel Connect connector{" "}
            <code>custom/openhacker</code> for the Vercel project created by{" "}
            <strong>npx openhacker</strong>. The deployed headless agent accepts
            authenticated OpenHacker channel deliveries and publishes results
            back to this team.
          </p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useEveAgent } from "eve/react";

export default function Home() {
  const [repo, setRepo] = useState("");
  const agent = useEveAgent();

  const busy = agent.status === "submitted" || agent.status === "streaming";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = repo.trim();
    if (!value || busy) return;
    agent.reset();
    agent.send({
      message: `Analyze the GitHub repository "${value}" for security vulnerabilities. Walk through what you check and report what you find.`,
    });
  }

  const reply = [...agent.data.messages]
    .reverse()
    .find((m) => m.role === "assistant");

  return (
    <main className="container">
      <h1>
        open<span>hacker</span>
      </h1>
      <p className="sub">
        Paste a GitHub repo and the agent will analyze it for vulnerabilities.
      </p>

      <form className="ask" onSubmit={onSubmit}>
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="owner/name or https://github.com/owner/name"
          autoFocus
        />
        <button type="submit" disabled={busy || !repo.trim()}>
          {busy ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {reply ? (
        <section className="reply">
          {reply.parts.map((part, i) => {
            if (part.type === "reasoning") {
              return (
                <p key={i} className="reasoning">
                  {part.text}
                </p>
              );
            }
            if (part.type === "text") {
              return (
                <p key={i} className="text">
                  {part.text}
                </p>
              );
            }
            if (part.type === "dynamic-tool") {
              return (
                <div key={i} className="tool">
                  <span className="tool-name">{part.toolName}</span>
                  <span className="tool-state">{part.state}</span>
                </div>
              );
            }
            return null;
          })}
          {agent.status === "streaming" ? (
            <span className="cursor" aria-hidden />
          ) : null}
        </section>
      ) : busy ? (
        <section className="reply">
          <span className="cursor" aria-hidden />
        </section>
      ) : null}

      {agent.status === "error" ? (
        <div className="banner">
          {String(agent.error ?? "Something went wrong.")}
        </div>
      ) : null}
    </main>
  );
}

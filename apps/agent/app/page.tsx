"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import { useEveAgent } from "eve/react";
import { CircleAlert } from "lucide-react";

import { AgentReport } from "@/components/agent-report";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractLatestAssistantReport } from "@/lib/extract-latest-assistant-report";
import { validateGitHubRepository } from "@/lib/repository";

export default function Home() {
  const [repo, setRepo] = useState("");
  const [error, setError] = useState("");
  const agent = useEveAgent();

  const scanning = agent.status === "submitted" || agent.status === "streaming";
  const hasAgentError = agent.status === "error";

  const report = useMemo(() => {
    if (scanning) return "";
    return extractLatestAssistantReport(agent.data.messages);
  }, [agent.data.messages, scanning]);

  const displayError = useMemo(() => {
    if (error) return error;
    if (hasAgentError) return String(agent.error ?? "Something went wrong.");
    return "";
  }, [error, hasAgentError, agent.error]);

  const onRepoChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setRepo(e.target.value);
    setError((prev) => (prev ? "" : prev));
  }, []);

  const onSubmit = useCallback(
    (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (scanning) return;

      const validation = validateGitHubRepository(repo);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      setError("");
      agent.reset();
      agent.send({
        message: `Analyze the GitHub repository ${validation.repository} for security vulnerabilities.`,
      });
    },
    [agent, repo, scanning],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          openhacker
        </h1>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <CardDescription>owner/name or full GitHub URL</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={onSubmit}
          >
            <Input
              type="text"
              value={repo}
              onChange={onRepoChange}
              placeholder="owner/repo"
              aria-label="GitHub repository"
              aria-invalid={Boolean(error)}
            />
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={scanning || !repo.trim()}
            >
              {scanning ? "Running" : "Analyze"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scanning || report ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardDescription>Report</CardDescription>
          </CardHeader>
          <CardContent>
            {report ? (
              <AgentReport markdown={report} />
            ) : (
              <p className="text-sm text-muted-foreground">hacking...</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {displayError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      ) : null}
    </main>
  );
}

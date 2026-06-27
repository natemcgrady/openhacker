"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, adminPassword, sessionToken } from "@/agent/lib/auth";
import { checkRepoAccess } from "@/agent/lib/github";
import { runScan } from "@/agent/lib/scan";
import { getStore } from "@/agent/lib/store";
import { DEFAULT_SETTINGS, type Finding, type Target } from "@/agent/lib/types";

function parseRepo(input: string): string | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  const url = trimmed.match(/github\.com[/:]([^/]+\/[^/]+)/);
  const candidate = url ? url[1] : trimmed;
  return /^[^/\s]+\/[^/\s]+$/.test(candidate) ? candidate : null;
}

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";
  const expected = adminPassword();

  if (!expected || password !== expected) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next);
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function addTarget(formData: FormData): Promise<void> {
  const repo = parseRepo(String(formData.get("repo") ?? ""));
  if (!repo) redirect("/?error=invalid-repo");

  const name = String(formData.get("name") ?? "").trim() || repo.split("/")[1];
  const branchInput = String(formData.get("branch") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const autoRemediate = formData.get("autoRemediate") === "on";

  const access = await checkRepoAccess(repo, token || null);
  const branch = branchInput || access.defaultBranch || "main";

  const target: Target = {
    id: crypto.randomUUID(),
    name,
    repo,
    branch,
    provider: "github",
    hasToken: Boolean(token),
    autoRemediate,
    createdAt: new Date().toISOString(),
  };

  const store = getStore();
  await store.saveTarget(target);
  if (token) await store.setTargetToken(target.id, token);

  revalidatePath("/");
  redirect(`/targets/${target.id}`);
}

export async function deleteTarget(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await getStore().deleteTarget(id);
  revalidatePath("/");
  redirect("/");
}

export async function scanTarget(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await runScan(id);
  revalidatePath("/");
  revalidatePath(`/targets/${id}`);
}

export async function setFindingStatus(formData: FormData): Promise<void> {
  const targetId = String(formData.get("targetId") ?? "");
  const findingId = String(formData.get("findingId") ?? "");
  const status = String(formData.get("status") ?? "open") as Finding["status"];

  const store = getStore();
  const findings = await store.listFindings(targetId);
  const match = findings.find((f) => f.id === findingId);
  if (match) await store.upsertFinding({ ...match, status });

  revalidatePath(`/targets/${targetId}`);
}

export async function saveSettings(formData: FormData): Promise<void> {
  const store = getStore();
  const current = await store.getSettings();
  await store.saveSettings({
    ...DEFAULT_SETTINGS,
    ...current,
    model: String(formData.get("model") ?? current.model) || DEFAULT_SETTINGS.model,
    autoRemediate: formData.get("autoRemediate") === "on",
    integrations: {
      github: { connected: formData.get("githubConnected") === "on" },
      hackerone: {
        connected: formData.get("hackeroneConnected") === "on",
        handle: String(formData.get("hackeroneHandle") ?? "").trim() || undefined,
      },
    },
  });
  revalidatePath("/settings");
}

import { runScan } from "@/agent/lib/scan";
import { getStore } from "@/agent/lib/store";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const token = process.env.OPENHACKER_API_TOKEN;
  if (!token) return true; // no API token configured — allow (dev)
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

/** Trigger a scan programmatically. Body: { targetId?: string } — omit to scan all. */
export async function POST(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let targetId: string | undefined;
  try {
    const body = (await req.json()) as { targetId?: string };
    targetId = body.targetId;
  } catch {
    // no body — scan all
  }

  const store = getStore();
  const targets = targetId ? [targetId] : (await store.listTargets()).map((t) => t.id);
  const results = await Promise.all(
    targets.map(async (id) => ({ targetId: id, ...(await runScan(id)) })),
  );

  return Response.json({ scanned: results.length, results });
}

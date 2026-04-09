import { readFile } from "node:fs/promises"

export const runtime = "nodejs"

const installScriptUrl = new URL("../../install", import.meta.url)

export async function GET(): Promise<Response> {
  const script = await readFile(installScriptUrl, "utf8")

  return new Response(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="install"',
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  })
}

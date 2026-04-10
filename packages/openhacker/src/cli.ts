import { createCliRenderer } from "@opentui/core"

import { mountLandingPage } from "./app"

export async function runOpenHacker(): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    backgroundColor: "#000000",
  })

  mountLandingPage(renderer)

  await new Promise<never>(() => {})
}

await runOpenHacker()

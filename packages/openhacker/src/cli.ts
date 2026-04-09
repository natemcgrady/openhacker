import { createCliRenderer } from "@opentui/core"

import { createLandingPage } from "./app"

export async function runOpenHacker(): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  })

  renderer.root.add(createLandingPage())

  await new Promise<never>(() => {})
}

await runOpenHacker()

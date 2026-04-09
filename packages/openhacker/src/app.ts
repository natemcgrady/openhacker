import { Box, Text } from "@opentui/core"

export function createLandingPage() {
  return Box(
    {
      width: "100%",
      height: "100%",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
    },
    Text({
      content: "openhacker",
      fg: "#67e8f9",
    }),
    Text({
      content: "hacking soon",
      fg: "#94a3b8",
    }),
  )
}

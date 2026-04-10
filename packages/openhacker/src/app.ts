import {
  CliRenderEvents,
  type CliRenderer,
  TextRenderable,
} from "@opentui/core"

const TITLE_ROWS = [
  "█▀▀█ █▀▀█ █▀▀▀ █▀▀▄ █  █ █▀▀█ █▀▀▀ █ █▄ █▀▀▀ █▀▀█",
  "█  █ █▄▄█ █▀▀  █  █ █▀▀█ █▄▄█ █    █▄▀  █▀▀  █▄▄▀",
  "▀▀▀▀ █    ▀▀▀▀ ▀  ▀ ▀  ▀ ▀  ▀ ▀▀▀▀ ▀ ▀▀ ▀▀▀▀ ▀  ▀",
] as const
const SUBTITLE = "hacking soon"
const EXIT_HINT = "Ctrl+C to exit"

export function mountLandingPage(renderer: CliRenderer) {
  const title = TITLE_ROWS.map(
    (content, index) =>
      new TextRenderable(renderer, {
        id: `landing-title-${index}`,
        content,
        fg: "#ffffff",
        position: "absolute",
        selectable: false,
      }),
  )

  const subtitle = new TextRenderable(renderer, {
    id: "landing-subtitle",
    content: SUBTITLE,
    fg: "#ffffff",
    position: "absolute",
    selectable: false,
  })

  const exitHint = new TextRenderable(renderer, {
    id: "landing-exit-hint",
    content: EXIT_HINT,
    fg: "#ffffff",
    position: "absolute",
    selectable: false,
  })

  const centerContent = () => {
    const titleHeight = TITLE_ROWS.length
    const contentHeight = titleHeight + 3
    const contentTop = Math.max(0, Math.floor((renderer.terminalHeight - contentHeight) / 2))

    title.forEach((row, index) => {
      row.left = Math.max(0, Math.floor((renderer.terminalWidth - TITLE_ROWS[index].length) / 2))
      row.top = contentTop + index
    })
    subtitle.left = Math.max(0, Math.floor((renderer.terminalWidth - SUBTITLE.length) / 2))
    subtitle.top = contentTop + titleHeight + 1
    exitHint.left = Math.max(0, Math.floor((renderer.terminalWidth - EXIT_HINT.length) / 2))
    exitHint.top = subtitle.top + 1
  }

  centerContent()
  title.forEach((row) => renderer.root.add(row))
  renderer.root.add(subtitle)
  renderer.root.add(exitHint)
  renderer.on(CliRenderEvents.RESIZE, centerContent)

  return () => {
    renderer.off(CliRenderEvents.RESIZE, centerContent)
    title.forEach((row) => renderer.root.remove(row.id))
    renderer.root.remove(subtitle.id)
    renderer.root.remove(exitHint.id)
  }
}

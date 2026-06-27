import { mkdir, rm, stat } from "node:fs/promises"
import path from "node:path"

type SupportedPlatform = "darwin" | "linux" | "windows"
type SupportedArch = "arm64" | "x64"
type SpawnResult = { exited: Promise<number> }

declare const Bun: {
  spawn(
    command: string[],
    options: {
      cwd: string
      stdout: "inherit"
      stderr: "inherit"
    },
  ): SpawnResult
}

const packageDir = process.cwd()
const distDir = path.join(packageDir, "dist")
const binaryName = process.platform === "win32" ? "openhacker.exe" : "openhacker"
const binaryPath = path.join(distDir, binaryName)

function getPlatform(): SupportedPlatform {
  switch (process.platform) {
    case "darwin":
      return "darwin"
    case "linux":
      return "linux"
    case "win32":
      return "windows"
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}

function getArch(): SupportedArch {
  switch (process.arch) {
    case "arm64":
      return "arm64"
    case "x64":
      return "x64"
    default:
      throw new Error(`Unsupported architecture: ${process.arch}`)
  }
}

function getArchiveName(): string {
  const target = `openhacker-${getPlatform()}-${getArch()}`
  return process.platform === "linux" ? `${target}.tar.gz` : `${target}.zip`
}

async function runCommand(command: string[]): Promise<void> {
  const result = await Bun.spawn(command, {
    cwd: packageDir,
    stdout: "inherit",
    stderr: "inherit",
  }).exited

  if (result !== 0) {
    throw new Error(`Command failed: ${command.join(" ")}`)
  }
}

async function compileBinary(): Promise<void> {
  await rm(distDir, { recursive: true, force: true })
  await mkdir(distDir, { recursive: true })

  await runCommand([
    "bun",
    "build",
    "--compile",
    "--outfile",
    binaryPath,
    path.join(packageDir, "src", "cli.ts"),
  ])

  await stat(binaryPath)
}

async function archiveBinary(): Promise<string> {
  const archivePath = path.join(distDir, getArchiveName())

  if (process.platform === "linux") {
    await runCommand(["tar", "-czf", archivePath, "-C", distDir, binaryName])
    return archivePath
  }

  if (process.platform === "win32") {
    await runCommand([
      "powershell",
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path "${binaryPath}" -DestinationPath "${archivePath}" -Force`,
    ])
    return archivePath
  }

  await runCommand(["zip", "-j", archivePath, binaryPath])
  return archivePath
}

await compileBinary()

if (!process.argv.includes("--binary-only")) {
  await archiveBinary()
}

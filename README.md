# openhacker

Minimal OpenTUI-based `openhacker` CLI.

## Local dev

```bash
pnpm openhacker:dev
```

## Build a release archive

```bash
pnpm openhacker:build
```

## Install like OpenCode

```bash
curl -fsSL https://openhacker.ai/install | bash
```

## Publish release assets

Push a version tag and GitHub Actions will build and publish the release archives used by the installer:

```bash
git tag v0.1.0
git push origin v0.1.0
```

# Openhacker

Monorepo for Openhacker.

## Packages

| Package | Description |
| --- | --- |
| [`apps/web`](./apps/web) | Web UI |
| [`packages/cli`](./packages/cli) | CLI tool |
| [`packages/openhacker`](./packages/openhacker) | npm package |

## Development

```bash
pnpm install
pnpm dev          # start the web UI
pnpm cli:dev      # run the CLI
```

## Install CLI from releases

```bash
curl -fsSL https://openhacker.ai/install | bash
```

## Publish release assets

Push a version tag and GitHub Actions will build and publish the release archives used by the installer:

```bash
git tag v0.1.0
git push origin v0.1.0
```

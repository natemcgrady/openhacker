# openhacker instance

Your self-hosted OpenHacker security agent. This is a headless
[eve](https://eve.dev) app that deploys directly to Vercel. It does not ship a
customer-facing web UI.

## What it does

- Runs the OpenHacker Eve agent inside the customer's deployment boundary.
- Uses the repository and scan instructions sent by the OpenHacker platform.
- Exposes a custom OpenHacker Eve channel for inbound platform scan requests.
- Returns scan reports to openhacker.ai in the channel response.

## Deploy to Vercel

1. Push this directory to a Git repository.
2. Import it into Vercel.
3. Register the deployed channel URL in `openhacker.ai/{team}`:
   `https://<your-agent-domain>/channels/openhacker`.
4. Enable Vercel Deployment Protection or equivalent network controls for the
   project so only the intended platform path can reach Eve routes.

Inference runs through the Vercel AI Gateway and authenticates automatically via Vercel
OIDC — no model API key required in production.

This package intentionally does not include a dashboard, forms, or local report
storage. Reports and findings belong in the OpenHacker platform.

The OpenHacker channel accepts direct scan requests on:

```text
POST /channels/openhacker
```

The request body is:

```json
{
  "runId": "scan-run-id",
  "repository": "owner/repo"
}
```

The response body contains the report payload that openhacker.ai stores:

```json
{
  "runId": "scan-run-id",
  "repository": "owner/repo",
  "markdown": "...",
  "findings": []
}
```

## Local development

```bash
pnpm install
cp .env.example .env.local   # set AI_GATEWAY_API_KEY for local model calls
pnpm dev
```

`pnpm dev` runs the Eve dev runtime locally. There is no local web dashboard;
use `pnpm eve:info` to inspect the discovered agent configuration.

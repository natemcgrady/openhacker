# openhacker

openhacker is a security platform with a headless customer-deployed
[eve](https://eve.dev) agent. You scaffold the agent, deploy it to Vercel in
your own environment, register its OpenHacker channel URL in openhacker.ai, then
send repository scans from the openhacker.ai dashboard.

## Create and run an instance

```bash
npx openhacker my-openhacker-app

cd my-openhacker-app
pnpm eve:info
```

`npx openhacker` scaffolds the instance, runs `pnpm install`, and creates an initial
git commit automatically (pass `--skip-install` or `--skip-git` to opt out).

Deploy the project to Vercel, then register the deployed OpenHacker channel URL
in openhacker.ai, for example
`https://your-agent.vercel.app/channels/openhacker`. The platform sends scan
requests directly to that channel, the agent runs Eve inside your deployment
boundary, and openhacker.ai stores the returned report.

## How the instance works

- **Headless Eve deploy.** `eve build` emits the Vercel Build Output bundle for
  the deployable agent project.
- **OpenHacker channel.** `agent/channels/openhacker.ts` exposes
  `POST /channels/openhacker` so openhacker.ai can send a repo scan request.
- **Inference via Vercel AI Gateway.** On Vercel it authenticates automatically through
  `VERCEL_OIDC_TOKEN` — no model key needed. Locally, set `AI_GATEWAY_API_KEY`.
- **Platform storage.** Reports and findings are stored in openhacker.ai, not
  in the customer-deployed agent.

## Contributing

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md) for monorepo setup and development commands.

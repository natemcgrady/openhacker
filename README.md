# openhacker

openhacker is a security platform with a headless customer-deployed
[eve](https://eve.dev) agent. You scaffold the agent, deploy it to Vercel in
your own environment, connect it to openhacker.ai through Vercel Connect, then
queue repository scans from the openhacker.ai dashboard.

## Create and run an instance

```bash
npx openhacker my-openhacker-app

cd my-openhacker-app
pnpm eve:info
```

`npx openhacker` scaffolds the instance, runs `pnpm install`, and creates an initial
git commit automatically (pass `--skip-install` or `--skip-git` to opt out).

Deploy the project to Vercel, then configure the project-linked Vercel Connect
connector `custom/openhacker` with the agent credential generated in
openhacker.ai. The OpenHacker custom Eve channel accepts authenticated platform
deliveries, runs Eve inside your deployment boundary, and sends reports back to
the platform. The scheduled poller remains as a fallback for queued scans.

## How the instance works

- **Headless Eve deploy.** `eve build` emits the Vercel Build Output bundle, so
  the Eve agent and its schedule deploy as one project.
- **OpenHacker channel.** `agent/channels/openhacker.ts` exposes authenticated
  HTTP and WebSocket routes so openhacker.ai can start a specific scan run.
- **Vercel Connect auth.** The agent requests OpenHacker credentials from the
  project-linked `custom/openhacker` connector instead of storing platform
  tokens in environment variables.
- **Inference via Vercel AI Gateway.** On Vercel it authenticates automatically through
  `VERCEL_OIDC_TOKEN` — no model key needed. Locally, set `AI_GATEWAY_API_KEY`.
- **Platform storage.** Reports and findings are stored in openhacker.ai, not
  in the customer-deployed agent.

## Contributing

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md) for monorepo setup and development commands.

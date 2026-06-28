# openhacker

openhacker is a self-hosted autonomous security agent built using [eve](https://eve.dev). You scaffold an instance, deploy it to Vercel, then manage everything from its dashboard: connect repositories, pick a model, and let it continuously scan for vulnerabilities and open remediation PRs.

## Create and run an instance

```bash
npx openhacker my-openhacker-app

cd my-openhacker-app
pnpm dev
```

`npx openhacker` scaffolds the instance, runs `pnpm install`, and creates an initial
git commit automatically (pass `--skip-install` or `--skip-git` to opt out).

Then open the printed URL, add a GitHub repo as a target, and click **Scan now**.

## How the instance works

- **One Vercel deploy.** `next.config.ts` wraps the app with `withEve`, so the dashboard
  and the eve agent (routes, tools, schedules) ship as a single project.
- **Protected dashboard.** Deployments are intended to run behind Vercel
  Deployment Protection. The browser calls the eve channel directly, so the
  deployment gate is the production access boundary.
- **Inference via Vercel AI Gateway.** On Vercel it authenticates automatically through
  `VERCEL_OIDC_TOKEN` — no model key needed. Locally, set `AI_GATEWAY_API_KEY`.
- **Continuous scanning.** The `daily_audit` schedule becomes a Vercel Cron Job and
  re-checks every target's dependencies against [OSV](https://osv.dev), so newly
  disclosed advisories are caught without a code change.
- **Simple storage for now.** This starter intentionally does not configure
  external persistence yet.

## Contributing

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md) for monorepo setup and development commands.

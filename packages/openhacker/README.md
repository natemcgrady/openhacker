# openhacker

Scaffold a headless OpenHacker Eve agent that connects to openhacker.ai.

## Create an instance

```bash
npx openhacker
cd openhacker
pnpm eve:info
```

Running `npx openhacker` with no arguments creates `./openhacker`.

Deploy the generated app to Vercel, then register the deployed OpenHacker
channel URL in openhacker.ai, for example
`https://your-agent.vercel.app/channels/openhacker`. The generated app exposes
that channel for platform-delivered scans.

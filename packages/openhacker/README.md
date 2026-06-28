# openhacker

Scaffold a headless OpenHacker Eve agent that connects to openhacker.ai.

## Create an instance

```bash
npx openhacker
cd openhacker
pnpm eve:info
```

Running `npx openhacker` with no arguments creates `./openhacker`.

Deploy the generated app to Vercel, then configure the project-linked Vercel
Connect connector `custom/openhacker` with the agent credential generated in
openhacker.ai. The generated app exposes an authenticated OpenHacker Eve channel
for platform-delivered scans, with a scheduled poller as a fallback.

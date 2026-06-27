import { getStore } from "@/agent/lib/store";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

const MODELS = [
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-opus-4.8",
  "openai/gpt-5.5",
  "google/gemini-2.5-pro",
];

export default async function SettingsPage() {
  const settings = await getStore().getSettings();

  return (
    <main className="container">
      <h1>Settings</h1>
      <p className="sub">Model, integrations, and remediation policy for this instance.</p>

      <form action={saveSettings}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Model</h2>
          <label htmlFor="model">Gateway model (routed via Vercel AI Gateway)</label>
          <select id="model" name="model" defaultValue={settings.model}>
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="mono-sm" style={{ marginTop: 8 }}>
            Note: the eve agent reads its model from the <code>OPENHACKER_MODEL</code> env var at
            boot. Set that in Vercel to change the deep-analysis model (a redeploy applies it).
          </p>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Remediation</h2>
          <div className="check">
            <input
              id="autoRemediate"
              name="autoRemediate"
              type="checkbox"
              defaultChecked={settings.autoRemediate}
            />
            <label htmlFor="autoRemediate">
              Open remediation PRs automatically for proven findings (never auto-merges)
            </label>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Integrations</h2>
          <div className="check" style={{ marginBottom: 12 }}>
            <input
              id="githubConnected"
              name="githubConnected"
              type="checkbox"
              defaultChecked={settings.integrations.github.connected}
            />
            <label htmlFor="githubConnected">GitHub connected (for remediation PRs)</label>
          </div>
          <div className="check" style={{ marginBottom: 12 }}>
            <input
              id="hackeroneConnected"
              name="hackeroneConnected"
              type="checkbox"
              defaultChecked={settings.integrations.hackerone.connected}
            />
            <label htmlFor="hackeroneConnected">
              HackerOne connected (validate inbound reports)
            </label>
          </div>
          <label htmlFor="hackeroneHandle">HackerOne program handle</label>
          <input
            id="hackeroneHandle"
            name="hackeroneHandle"
            type="text"
            placeholder="acme"
            defaultValue={settings.integrations.hackerone.handle ?? ""}
          />
          <p className="mono-sm" style={{ marginTop: 8 }}>
            Integration wiring is stubbed in this build; toggles persist the intended config.
          </p>
        </div>

        <button type="submit">Save settings</button>
      </form>
    </main>
  );
}

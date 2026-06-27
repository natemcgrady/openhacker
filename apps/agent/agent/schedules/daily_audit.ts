import { defineSchedule } from "eve/schedules";
import { runScan } from "../lib/scan";
import { getStore } from "../lib/store";

// Becomes a Vercel Cron Job on deploy. Vercel evaluates cron in UTC.
// Deterministically re-scans every configured target's dependencies against OSV,
// so newly disclosed advisories are caught even when the code has not changed.
export default defineSchedule({
  cron: "0 6 * * *",
  run({ waitUntil }) {
    waitUntil(
      (async () => {
        const targets = await getStore().listTargets();
        for (const target of targets) {
          await runScan(target.id);
        }
      })(),
    );
  },
});

import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {};

// Mounts the eve agent (agent/) and the dashboard as a single Vercel deployment.
// Schedules under agent/schedules become Vercel Cron Jobs automatically.
export default withEve(nextConfig);

import { defineAgent } from "eve";

export default defineAgent({
  // Routes through the Vercel AI Gateway. On Vercel this authenticates with the
  // injected VERCEL_OIDC_TOKEN automatically; locally it uses AI_GATEWAY_API_KEY.
  // The model picker in the dashboard writes OPENHACKER_MODEL.
  model: process.env.OPENHACKER_MODEL ?? "anthropic/claude-sonnet-4.6",
  reasoning: "medium",
});

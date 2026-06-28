import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/auth-schema";
import { getEnv } from "./env";

export const auth = betterAuth({
  secret: getEnv("BETTER_AUTH_SECRET"),
  baseURL: getEnv("BETTER_AUTH_URL"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
  ],
});

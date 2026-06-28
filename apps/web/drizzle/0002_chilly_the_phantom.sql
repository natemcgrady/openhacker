UPDATE "agent_token" AS "older"
SET "revoked_at" = now()
WHERE "older"."revoked_at" IS NULL
AND EXISTS (
  SELECT 1
  FROM "agent_token" AS "newer"
  WHERE "newer"."organization_id" = "older"."organization_id"
  AND "newer"."revoked_at" IS NULL
  AND (
    "newer"."created_at" > "older"."created_at"
    OR (
      "newer"."created_at" = "older"."created_at"
      AND "newer"."id" > "older"."id"
    )
  )
);--> statement-breakpoint
CREATE UNIQUE INDEX "agentToken_activeOrganizationId_uidx" ON "agent_token" USING btree ("organization_id") WHERE "agent_token"."revoked_at" is null;
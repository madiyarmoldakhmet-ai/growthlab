-- Multi-tenancy: introduce organizations and scope users/contacts/campaigns to them.

-- 1. Organizations table
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- 2. Default organization used to backfill any pre-existing rows
INSERT INTO "organizations" ("id", "name", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', CURRENT_TIMESTAMP);

-- 3. Add organization_id columns (nullable first so backfill can run)
ALTER TABLE "users" ADD COLUMN "organization_id" UUID;
ALTER TABLE "contacts" ADD COLUMN "organization_id" UUID;
ALTER TABLE "campaigns" ADD COLUMN "organization_id" UUID;

-- 4. Backfill existing rows
UPDATE "users" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL;
UPDATE "contacts" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL;
UPDATE "campaigns" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL;

-- 5. Enforce NOT NULL now that every row has a value
ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "contacts" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "campaigns" ALTER COLUMN "organization_id" SET NOT NULL;

-- 6. Indexes
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "contacts_organization_id_idx" ON "contacts"("organization_id");
CREATE INDEX "campaigns_organization_id_idx" ON "campaigns"("organization_id");

-- 7. Foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

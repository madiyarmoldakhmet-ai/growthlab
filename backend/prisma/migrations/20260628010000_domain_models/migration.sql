-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('email', 'telegram', 'whatsapp', 'sms');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('apollo', 'csv', 'manual', 'referral', 'other');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'verifying', 'ready', 'queued', 'contacted', 'replied', 'won', 'lost', 'suppressed');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'valid', 'invalid', 'risky', 'catch_all', 'unknown');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('queued', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'positive', 'negative', 'demo', 'won', 'lost', 'hard_bounced', 'soft_bounced', 'complained', 'unsubscribed', 'failed');

-- CreateEnum
CREATE TYPE "ResponseSentiment" AS ENUM ('positive', 'negative', 'neutral', 'auto_reply');

-- CreateEnum
CREATE TYPE "CampaignLeadStatus" AS ENUM ('active', 'excluded', 'completed', 'bounced');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('unsubscribe', 'hard_bounce', 'complaint', 'manual', 'invalid');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('granted', 'revoked');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageStatus" ADD VALUE 'scheduled';
ALTER TYPE "MessageStatus" ADD VALUE 'bounced';

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_user_id_fkey";

-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_user_id_fkey";

-- DropIndex
DROP INDEX "campaigns_organization_id_idx";

-- DropIndex
DROP INDEX "campaigns_status_idx";

-- DropIndex
DROP INDEX "contacts_email_idx";

-- DropIndex
DROP INDEX "contacts_organization_id_idx";

-- DropIndex
DROP INDEX "messages_status_idx";

-- DropIndex
DROP INDEX "messages_user_id_idx";

-- DropIndex
DROP INDEX "settings_user_id_key_key";

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "audience" JSONB,
ADD COLUMN     "channel" "ChannelType",
ADD COLUMN     "channel_id" UUID,
ADD COLUMN     "goal" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "bounced_at" TIMESTAMP(3),
ADD COLUMN     "channel_id" UUID,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "lead_id" UUID,
ADD COLUMN     "opened_at" TIMESTAMP(3),
ADD COLUMN     "organization_id" UUID NOT NULL,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "provider_message_id" TEXT,
ADD COLUMN     "replied_at" TIMESTAMP(3),
ADD COLUMN     "step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unsubscribe_token" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "responses" ADD COLUMN     "ai_category" TEXT,
ADD COLUMN     "ai_evaluated_at" TIMESTAMP(3),
ADD COLUMN     "ai_score" INTEGER,
ADD COLUMN     "lead_id" UUID,
ADD COLUMN     "organization_id" UUID NOT NULL,
ADD COLUMN     "sentiment" "ResponseSentiment",
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "organization_id" UUID NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "company" TEXT,
    "position" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'manual',
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "verified_at" TIMESTAMP(3),
    "demo_at" TIMESTAMP(3),
    "won_at" TIMESTAMP(3),
    "lost_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "ChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT,
    "config" JSONB,
    "daily_limit" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "status" "CampaignLeadStatus" NOT NULL DEFAULT 'active',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),

    CONSTRAINT "campaign_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "EventType" NOT NULL,
    "channel_type" "ChannelType",
    "message_id" UUID,
    "lead_id" UUID,
    "campaign_id" UUID,
    "provider" TEXT,
    "provider_event_id" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppressions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_type" "ChannelType" NOT NULL DEFAULT 'email',
    "address" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source" TEXT,
    "lead_id" UUID,
    "message_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "lead_id" UUID,
    "channel_type" "ChannelType" NOT NULL,
    "address" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'granted',
    "source" TEXT,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_organization_id_status_idx" ON "leads"("organization_id", "status");

-- CreateIndex
CREATE INDEX "leads_organization_id_verification_status_idx" ON "leads"("organization_id", "verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organization_id_email_key" ON "leads"("organization_id", "email");

-- CreateIndex
CREATE INDEX "channels_organization_id_type_idx" ON "channels"("organization_id", "type");

-- CreateIndex
CREATE INDEX "campaign_leads_organization_id_idx" ON "campaign_leads"("organization_id");

-- CreateIndex
CREATE INDEX "campaign_leads_campaign_id_idx" ON "campaign_leads"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_leads_lead_id_idx" ON "campaign_leads"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_leads_campaign_id_lead_id_key" ON "campaign_leads"("campaign_id", "lead_id");

-- CreateIndex
CREATE INDEX "events_organization_id_occurred_at_idx" ON "events"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "events_campaign_id_type_occurred_at_idx" ON "events"("campaign_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "events_lead_id_idx" ON "events"("lead_id");

-- CreateIndex
CREATE INDEX "events_message_id_idx" ON "events"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_organization_id_provider_provider_event_id_key" ON "events"("organization_id", "provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "suppressions_organization_id_address_idx" ON "suppressions"("organization_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "suppressions_organization_id_channel_type_address_key" ON "suppressions"("organization_id", "channel_type", "address");

-- CreateIndex
CREATE INDEX "consents_organization_id_idx" ON "consents"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "consents_organization_id_channel_type_address_key" ON "consents"("organization_id", "channel_type", "address");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_status_idx" ON "campaigns"("organization_id", "status");

-- CreateIndex
CREATE INDEX "contacts_organization_id_email_idx" ON "contacts"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "messages_unsubscribe_token_key" ON "messages"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "messages_organization_id_status_scheduled_at_idx" ON "messages"("organization_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "messages_lead_id_idx" ON "messages"("lead_id");

-- CreateIndex
CREATE INDEX "messages_channel_id_idx" ON "messages"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_organization_id_idempotency_key_key" ON "messages"("organization_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "messages_provider_provider_message_id_key" ON "messages"("provider", "provider_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_campaign_id_lead_id_step_key" ON "messages"("campaign_id", "lead_id", "step");

-- CreateIndex
CREATE INDEX "responses_organization_id_idx" ON "responses"("organization_id");

-- CreateIndex
CREATE INDEX "responses_lead_id_idx" ON "responses"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_organization_id_key_key" ON "settings"("organization_id", "key");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('GMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'QUEUED', 'SENT', 'REPLIED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "channel_type" "ChannelType" NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "text" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "wa_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_client_id_idx" ON "campaigns"("client_id");

-- CreateIndex
CREATE INDEX "contacts_campaign_id_idx" ON "contacts"("campaign_id");

-- CreateIndex
CREATE INDEX "contacts_status_idx" ON "contacts"("status");

-- CreateIndex
CREATE INDEX "messages_contact_id_idx" ON "messages"("contact_id");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

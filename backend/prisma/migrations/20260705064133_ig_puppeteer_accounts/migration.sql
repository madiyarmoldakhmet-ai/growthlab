-- CreateEnum
CREATE TYPE "SendingPlatform" AS ENUM ('GMAIL', 'WHATSAPP', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "SendingAccountStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE 'INSTAGRAM';

-- CreateTable
CREATE TABLE "sending_accounts" (
    "id" UUID NOT NULL,
    "platform" "SendingPlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "identifier" TEXT NOT NULL,
    "sessionCookies" TEXT NOT NULL,
    "status" "SendingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sending_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sending_accounts_platform_status_idx" ON "sending_accounts"("platform", "status");

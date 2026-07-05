import { IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ChannelType, ContactStatus } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  clientName?: string;
}

export class CreateContactDto {
  @IsString()
  campaignId!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(ChannelType)
  channelType!: ChannelType;
}

export class SendEmailDto {
  @IsString()
  contactId!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

export class SendWhatsappDto {
  @IsString()
  contactId!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

export class CreateSendingAccountDto {
  @IsString()
  @MinLength(1)
  identifier!: string;

  @IsString()
  @MinLength(1)
  sessionCookies!: string;
}

export class SendInstagramDto {
  @IsString()
  contactId!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

// Helper to coerce a loose string into a ChannelType at the controller boundary.
export const ALLOWED_CHANNEL_TYPES: readonly ChannelType[] = [
  ChannelType.GMAIL,
  ChannelType.WHATSAPP,
] as const;

export function parseChannelType(value: unknown): ChannelType {
  if (typeof value !== 'string') return ChannelType.GMAIL;
  const up = value.trim().toUpperCase();
  if (up === 'WHATSAPP' || up === 'WA' || up === 'WHAT') return ChannelType.WHATSAPP;
  return ChannelType.GMAIL;
}

export const ALLOWED_CONTACT_STATUSES: readonly ContactStatus[] = [
  ContactStatus.NEW,
  ContactStatus.QUEUED,
  ContactStatus.SENT,
  ContactStatus.REPLIED,
] as const;

export function parseContactStatus(value: unknown): ContactStatus | undefined {
  if (typeof value !== 'string') return undefined;
  const up = value.trim().toUpperCase();
  return (ALLOWED_CONTACT_STATUSES as readonly string[]).includes(up)
    ? (up as ContactStatus)
    : undefined;
}
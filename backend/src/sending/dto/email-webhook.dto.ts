import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const WEBHOOK_TYPES = ['delivered', 'open', 'bounce', 'complaint', 'unsubscribe'];
const BOUNCE_TYPES = ['hard', 'soft'];

export class WebhookEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerMessageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  messageId?: string;

  @IsIn(WEBHOOK_TYPES)
  type!: 'delivered' | 'open' | 'bounce' | 'complaint' | 'unsubscribe';

  @IsOptional()
  @IsIn(BOUNCE_TYPES)
  bounceType?: 'hard' | 'soft';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  providerEventId!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class EmailWebhookDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => WebhookEventDto)
  events!: WebhookEventDto[];
}

import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ChannelType } from '@prisma/client';

const CHANNEL_TYPES: ChannelType[] = ['email', 'telegram', 'whatsapp', 'sms'];

export class CreateSendingAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsIn(CHANNEL_TYPES)
  type?: ChannelType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  identifier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  dailyLimit?: number;
}

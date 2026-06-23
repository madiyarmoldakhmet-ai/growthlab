import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class SyncGmailRepliesDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxResults?: number;
}

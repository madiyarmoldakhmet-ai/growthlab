import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpsertGmailOAuthDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  clientSecret?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  redirectUri?: string;

  @IsString()
  @MinLength(1)
  refreshToken!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  accessToken?: string;
}

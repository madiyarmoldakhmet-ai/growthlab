import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpsertGmailOAuthDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  authorizedEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

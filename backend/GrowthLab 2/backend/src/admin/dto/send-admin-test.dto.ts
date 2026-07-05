import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendAdminTestDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(40)
  whatsappTo?: string;

  @IsOptional()
  @IsEmail()
  emailTo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message?: string;
}

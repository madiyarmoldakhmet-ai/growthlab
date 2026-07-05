import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

const CAMPAIGN_STATUSES: CampaignStatus[] = ['draft', 'active', 'paused', 'completed'];

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: CampaignStatus;
}

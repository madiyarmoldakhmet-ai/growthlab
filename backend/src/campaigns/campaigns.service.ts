import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Campaign } from './entities/campaign.entity';

@Injectable()
export class CampaignsService {
  private readonly campaigns = new Map<string, Campaign>();

  create(createCampaignDto: CreateCampaignDto): Campaign {
    const now = new Date();
    const campaign: Campaign = {
      id: randomUUID(),
      name: createCampaignDto.name,
      description: createCampaignDto.description,
      status: createCampaignDto.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    };

    this.campaigns.set(campaign.id, campaign);

    return campaign;
  }

  findAll(): Campaign[] {
    return Array.from(this.campaigns.values());
  }

  update(id: string, updateCampaignDto: UpdateCampaignDto): Campaign {
    const campaign = this.findById(id);
    const updatedCampaign: Campaign = {
      ...campaign,
      ...updateCampaignDto,
      updatedAt: new Date(),
    };

    this.campaigns.set(id, updatedCampaign);

    return updatedCampaign;
  }

  remove(id: string): void {
    this.findById(id);
    this.campaigns.delete(id);
  }

  private findById(id: string): Campaign {
    const campaign = this.campaigns.get(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" was not found`);
    }

    return campaign;
  }
}

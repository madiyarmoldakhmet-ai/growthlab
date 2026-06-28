import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus as PrismaCampaignStatus } from '@prisma/client';
import { AuthScope } from '../common/types/auth-scope';
import { PrismaService } from '../prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Campaign, CampaignStatus } from './entities/campaign.entity';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(scope: AuthScope, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = await this.prisma.campaign.create({
      data: {
        organization: { connect: { id: scope.organizationId } },
        user: { connect: { id: scope.userId } },
        name: createCampaignDto.name,
        description: createCampaignDto.description,
        status: this.toPrismaStatus(createCampaignDto.status ?? 'draft'),
      },
    });

    return this.toEntity(campaign);
  }

  async findAll(scope: AuthScope): Promise<Campaign[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => this.toEntity(campaign));
  }

  async update(
    scope: AuthScope,
    id: string,
    updateCampaignDto: UpdateCampaignDto,
  ): Promise<Campaign> {
    await this.findById(scope, id);
    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: updateCampaignDto.name,
        description: updateCampaignDto.description,
        status: updateCampaignDto.status
          ? this.toPrismaStatus(updateCampaignDto.status)
          : undefined,
      },
    });

    return this.toEntity(updatedCampaign);
  }

  async remove(scope: AuthScope, id: string): Promise<void> {
    await this.findById(scope, id);
    await this.prisma.campaign.delete({ where: { id } });
  }

  private async findById(scope: AuthScope, id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: scope.organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" was not found`);
    }

    return this.toEntity(campaign);
  }

  private toEntity(campaign: {
    id: string;
    name: string;
    description: string | null;
    status: PrismaCampaignStatus;
    createdAt: Date;
    updatedAt: Date;
  }): Campaign {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? undefined,
      status: campaign.status as CampaignStatus,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  private toPrismaStatus(status: CampaignStatus): PrismaCampaignStatus {
    return status as PrismaCampaignStatus;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus as PrismaCampaignStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Campaign, CampaignStatus } from './entities/campaign.entity';

const LEGACY_USER_EMAIL = 'legacy@growthlab.local';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const userId = await this.getUserScope();
    const campaign = await this.prisma.campaign.create({
      data: {
        user: { connect: { id: userId } },
        name: createCampaignDto.name,
        description: createCampaignDto.description,
        status: this.toPrismaStatus(createCampaignDto.status ?? 'draft'),
      },
    });

    return this.toEntity(campaign);
  }

  async findAll(): Promise<Campaign[]> {
    const userId = await this.getUserScope();
    const campaigns = await this.prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => this.toEntity(campaign));
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    await this.findById(id);
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

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.campaign.delete({ where: { id } });
  }

  private async findById(id: string): Promise<Campaign> {
    const userId = await this.getUserScope();
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
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

  private async getUserScope(): Promise<string> {
    // TODO: Pass CurrentUser.id from JWT-protected controllers and remove this legacy fallback.
    const user = await this.prisma.user.upsert({
      where: { email: LEGACY_USER_EMAIL },
      update: {},
      create: {
        email: LEGACY_USER_EMAIL,
        passwordHash: 'legacy-local-user',
        role: 'admin',
      },
      select: { id: true },
    });

    return user.id;
  }
}

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Campaign } from './entities/campaign.entity';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Body() createCampaignDto: CreateCampaignDto): Campaign {
    return this.campaignsService.create(createCampaignDto);
  }

  @Get()
  findAll(): Campaign[] {
    return this.campaignsService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto): Campaign {
    return this.campaignsService.update(id, updateCampaignDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): void {
    this.campaignsService.remove(id);
  }
}

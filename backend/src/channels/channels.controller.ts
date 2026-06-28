import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthScope } from '../common/types/auth-scope';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChannelDto) {
    return this.channelsService.create(this.scope(user), dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.channelsService.findAll(this.scope(user));
  }

  private scope(user: AuthenticatedUser): AuthScope {
    return { organizationId: user.organizationId, userId: user.id };
  }
}

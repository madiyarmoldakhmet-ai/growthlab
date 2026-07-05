import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthScope } from '../common/types/auth-scope';
import { RunSendDto } from './dto/run-send.dto';
import { SendingService } from './sending.service';

@UseGuards(JwtAuthGuard)
@Controller('sending')
export class SendingController {
  constructor(private readonly sendingService: SendingService) {}

  @Post('messages/:id')
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sendingService.sendMessage(this.scope(user), id);
  }

  @Post('run')
  run(@CurrentUser() user: AuthenticatedUser, @Body() dto: RunSendDto) {
    return this.sendingService.sendQueued(this.scope(user), dto.limit);
  }

  private scope(user: AuthenticatedUser): AuthScope {
    return { organizationId: user.organizationId, userId: user.id };
  }
}

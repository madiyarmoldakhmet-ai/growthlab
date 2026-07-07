import { Body, Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthScope } from '../common/types/auth-scope';
import { RunVerificationDto } from './dto/run-verification.dto';
import { VerificationService } from './verification.service';

@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('leads/:id')
  verifyContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    return this.verificationService.verifyContact(this.scope(user), id, force === 'true');
  }

  @Post('run')
  run(@CurrentUser() user: AuthenticatedUser, @Body() dto: RunVerificationDto) {
    return this.verificationService.verifyPending(this.scope(user), dto.limit);
  }

  private scope(user: AuthenticatedUser): AuthScope {
    return { organizationId: user.organizationId, userId: user.id };
  }
}

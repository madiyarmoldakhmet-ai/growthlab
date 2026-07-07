import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthScope } from '../common/types/auth-scope';
import { RunPersonalizationDto } from './dto/run-personalization.dto';
import { PersonalizationService } from './personalization.service';

@UseGuards(JwtAuthGuard)
@Controller('personalization')
export class PersonalizationController {
  constructor(private readonly personalizationService: PersonalizationService) {}

  @Post('leads/:id')
  generateForContact(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.personalizationService.generateForContact(this.scope(user), id);
  }

  @Post('run')
  run(@CurrentUser() user: AuthenticatedUser, @Body() dto: RunPersonalizationDto) {
    return this.personalizationService.generatePending(this.scope(user), dto.limit);
  }

  private scope(user: AuthenticatedUser): AuthScope {
    return { organizationId: user.organizationId, userId: user.id };
  }
}

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthScope } from '../common/types/auth-scope';
import { SearchLeadsDto } from './dto/search-leads.dto';
import { LeadsService } from './leads.service';

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.findAll(this.scope(user));
  }

  @Post('import/csv')
  async importCsv(@CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.leadsService.importCsv(this.scope(user), await this.readUpload(request));
  }

  @Post('search/apollo')
  searchApollo(@CurrentUser() user: AuthenticatedUser, @Body() dto: SearchLeadsDto) {
    return this.leadsService.searchApollo(this.scope(user), dto);
  }

  private scope(user: AuthenticatedUser): AuthScope {
    return { organizationId: user.organizationId, userId: user.id };
  }

  private async readUpload(request: FastifyRequest): Promise<Buffer | undefined> {
    const file = await request.file();
    return file?.toBuffer();
  }
}

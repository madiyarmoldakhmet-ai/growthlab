import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthScope } from '../common/types/auth-scope';
import { SearchContactsDto } from './dto/search-contacts.dto';
import { ContactsService } from './contacts.service';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly leadsService: ContactsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.findAll(this.scope(user));
  }

  @Post('import/csv')
  async importCsv(@CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.leadsService.importCsv(this.scope(user), await this.readUpload(request));
  }

  @Post('search/apollo')
  searchApollo(@CurrentUser() user: AuthenticatedUser, @Body() dto: SearchContactsDto) {
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

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthScope } from '../common/types/auth-scope';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactsService } from './contacts.service';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.findAll(this.scope(user));
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.findOne(this.scope(user), id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactsService.create(this.scope(user), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(this.scope(user), id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.contactsService.remove(this.scope(user), id);
    return { deleted: true };
  }

  @Post('deduplicate')
  removeDuplicates(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.removeDuplicates(this.scope(user));
  }

  @Post('import/csv')
  async importCsv(@CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.contactsService.importCsv(this.scope(user), await this.readUpload(request));
  }

  @Post('import/excel')
  async importExcel(@CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.contactsService.importExcel(this.scope(user), await this.readUpload(request));
  }

  private scope(user: AuthenticatedUser): AuthScope {
    return { organizationId: user.organizationId, userId: user.id };
  }

  private async readUpload(request: FastifyRequest): Promise<Buffer | undefined> {
    const file = await request.file();
    return file?.toBuffer();
  }
}

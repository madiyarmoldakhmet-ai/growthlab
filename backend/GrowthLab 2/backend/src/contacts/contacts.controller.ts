import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll() {
    return this.contactsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.contactsService.remove(id);
    return { deleted: true };
  }

  @Post('deduplicate')
  removeDuplicates() {
    return this.contactsService.removeDuplicates();
  }

  @Post('import/csv')
  async importCsv(@Req() request: FastifyRequest) {
    return this.contactsService.importCsv(await this.readUpload(request));
  }

  @Post('import/excel')
  async importExcel(@Req() request: FastifyRequest) {
    return this.contactsService.importExcel(await this.readUpload(request));
  }

  private async readUpload(request: FastifyRequest): Promise<Buffer | undefined> {
    const file = await request.file();
    return file?.toBuffer();
  }
}

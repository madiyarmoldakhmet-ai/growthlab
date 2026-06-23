import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactsService } from './contacts.service';

type UploadedContactFile = {
  buffer: Buffer;
};

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
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file?: UploadedContactFile) {
    return this.contactsService.importCsv(file?.buffer);
  }

  @Post('import/excel')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file?: UploadedContactFile) {
    return this.contactsService.importExcel(file?.buffer);
  }
}

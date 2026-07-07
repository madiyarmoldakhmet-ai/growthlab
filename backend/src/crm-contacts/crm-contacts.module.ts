import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { CrmContactsController } from './crm-contacts.controller';
import { CrmContactsService } from './crm-contacts.service';

@Module({
  imports: [AuthModule],
  controllers: [CrmContactsController],
  providers: [CrmContactsService],
  exports: [CrmContactsService],
})
export class CrmContactsModule {}

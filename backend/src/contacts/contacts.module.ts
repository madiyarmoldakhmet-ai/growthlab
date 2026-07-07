import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { ApolloAdapter } from './contact-sources/apollo.adapter';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [AuthModule],
  controllers: [ContactsController],
  providers: [ContactsService, ApolloAdapter],
  exports: [ContactsService],
})
export class ContactsModule {}

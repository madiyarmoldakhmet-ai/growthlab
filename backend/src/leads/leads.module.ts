import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { ApolloAdapter } from './lead-sources/apollo.adapter';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService, ApolloAdapter],
  exports: [LeadsService],
})
export class LeadsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { SendingAccountsController } from './sending-accounts.controller';
import { SendingAccountsService } from './sending-accounts.service';

@Module({
  imports: [AuthModule],
  controllers: [SendingAccountsController],
  providers: [SendingAccountsService],
  exports: [SendingAccountsService],
})
export class SendingAccountsModule {}

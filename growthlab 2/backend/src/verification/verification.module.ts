import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ZeroBounceAdapter } from './zerobounce.adapter';

@Module({
  imports: [AuthModule],
  controllers: [VerificationController],
  providers: [VerificationService, ZeroBounceAdapter],
  exports: [VerificationService],
})
export class VerificationModule {}

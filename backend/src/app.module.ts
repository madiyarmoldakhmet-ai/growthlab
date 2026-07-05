import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma.module';
import { CleanMvpModule } from './clean-mvp/clean-mvp.module';
import { EmailWorkerModule } from './email-worker/email-worker.module';
import { NodemailerTransporterService } from './common/nodemailer-transporter.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    CleanMvpModule,
    EmailWorkerModule,
  ],
  providers: [NodemailerTransporterService],
})
export class AppModule {}
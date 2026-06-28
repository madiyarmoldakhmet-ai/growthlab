import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { OpenAiAdapter } from './llm/openai.adapter';
import { PersonalizationController } from './personalization.controller';
import { PersonalizationService } from './personalization.service';

@Module({
  imports: [AuthModule],
  controllers: [PersonalizationController],
  providers: [PersonalizationService, OpenAiAdapter],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}

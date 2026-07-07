import { Module } from '@nestjs/common';
import { AiModuleOptions } from './ai.types';
import { AiService } from './ai.service';

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {
  static createService(options?: AiModuleOptions): AiService {
    return new AiService(options);
  }
}

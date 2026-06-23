import { AiModuleOptions } from './ai.types';
import { AiService } from './ai.service';

export class AiModule {
  static createService(options?: AiModuleOptions): AiService {
    return new AiService(options);
  }
}

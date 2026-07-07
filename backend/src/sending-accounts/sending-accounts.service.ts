import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../config/configuration';
import { AuthScope } from '../common/types/auth-scope';
import { PrismaService } from '../prisma.service';
import { CreateSendingAccountDto } from './dto/create-sending-account.dto';

@Injectable()
export class SendingAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  create(scope: AuthScope, dto: CreateSendingAccountDto) {
    return this.prisma.sendingAccount.create({
      data: {
        organizationId: scope.organizationId,
        type: dto.type ?? 'email',
        name: dto.name,
        identifier: dto.identifier,
        dailyLimit: dto.dailyLimit ?? this.config.get('sending.defaultDailyLimit', { infer: true }),
      },
    });
  }

  findAll(scope: AuthScope) {
    return this.prisma.sendingAccount.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

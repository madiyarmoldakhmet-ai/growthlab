import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Schema of required/optional environment variables.
 * Validated once at boot — the app refuses to start with an invalid config.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  PORT = 3001;

  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DIRECT_URL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  APP_PUBLIC_URL?: string;

  // ─── SMTP (outbound email transport) ─────────────────────────
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SMTP_PORT?: number;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  SMTP_FROM_NAME?: string;

  // ─── Instagram Webhook (Meta) ───────────────────────────────
  @IsOptional()
  @IsString()
  IG_WEBHOOK_VERIFY_TOKEN?: string;

  @IsOptional()
  @IsString()
  IG_WEBHOOK_PAGE_ACCESS_TOKEN?: string;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  IG_GRAPH_API_VERSION?: string;

  @IsOptional()
  @IsString()
  IG_WEBHOOK_FALLBACK_ECHO?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .filter(Boolean)
      .join('\n  - ');

    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  return validated;
}
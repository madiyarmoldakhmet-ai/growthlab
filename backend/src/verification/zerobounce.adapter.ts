import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../config/configuration';
import {
  EmailVerifier,
  VerificationResult,
  VerifiedStatus,
} from './email-verifier.interface';

interface ZeroBounceResponse {
  status?: string;
  sub_status?: string;
  error?: string;
}

@Injectable()
export class ZeroBounceAdapter implements EmailVerifier {
  readonly provider = 'zerobounce';
  private readonly logger = new Logger(ZeroBounceAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService<AppConfiguration, true>) {
    this.apiKey = config.get('zerobounce.apiKey', { infer: true }) ?? '';
    this.baseUrl =
      config.get('zerobounce.baseUrl', { infer: true }) ?? 'https://api.zerobounce.net/v2';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  // TODO(Ф6): run through the BullMQ queue (rate-limit + retries) instead of a sync call.
  async verify(email: string): Promise<VerificationResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'zerobounce_not_configured',
        message: 'ZeroBounce is not configured. Set ZEROBOUNCE_API_KEY in the environment.',
      });
    }

    const url = `${this.baseUrl}/validate?api_key=${encodeURIComponent(
      this.apiKey,
    )}&email=${encodeURIComponent(email)}&ip_address=`;

    let response: Response;
    try {
      response = await fetch(url, { method: 'GET' });
    } catch (error) {
      this.logger.error(`ZeroBounce request failed: ${this.errorMessage(error)}`);
      throw new ServiceUnavailableException({
        code: 'zerobounce_provider_unavailable',
        message: 'ZeroBounce request failed.',
      });
    }

    if (!response.ok) {
      this.logger.warn(`ZeroBounce responded with status ${response.status}`);
      throw new ServiceUnavailableException({
        code: 'zerobounce_provider_error',
        message: `ZeroBounce request failed with status ${response.status}.`,
      });
    }

    const data = (await response.json()) as ZeroBounceResponse;
    if (data.error) {
      throw new ServiceUnavailableException({
        code: 'zerobounce_provider_error',
        message: data.error,
      });
    }

    return {
      status: this.mapStatus(data.status),
      subStatus: data.sub_status || undefined,
    };
  }

  private mapStatus(status: string | undefined): VerifiedStatus {
    switch ((status ?? '').toLowerCase()) {
      case 'valid':
        return 'valid';
      case 'invalid':
        return 'invalid';
      case 'catch-all':
        return 'catch_all';
      // do_not_mail / spamtrap / abuse: deliverable but must not be mailed.
      case 'spamtrap':
      case 'abuse':
      case 'do_not_mail':
        return 'risky';
      default:
        return 'unknown';
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

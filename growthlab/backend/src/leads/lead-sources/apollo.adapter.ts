import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadSource } from '@prisma/client';
import { AppConfiguration } from '../../config/configuration';
import { cleanString, normalizeEmail } from '../../common/normalize.util';
import {
  LeadCandidate,
  LeadSearchQuery,
  LeadSourceAdapter,
} from './lead-source.interface';

// Apollo can return this placeholder when an email is not unlocked on the plan.
const LOCKED_EMAIL = 'email_not_unlocked@domain.com';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

interface ApolloPerson {
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string | null;
  linkedin_url?: string;
  id?: string;
  organization?: { name?: string; website_url?: string };
  phone_numbers?: { sanitized_number?: string; raw_number?: string }[];
}

@Injectable()
export class ApolloAdapter implements LeadSourceAdapter {
  readonly source: LeadSource = 'apollo';
  private readonly logger = new Logger(ApolloAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService<AppConfiguration, true>) {
    this.apiKey = config.get('apollo.apiKey', { infer: true }) ?? '';
    this.baseUrl = config.get('apollo.baseUrl', { infer: true }) ?? 'https://api.apollo.io';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  // TODO(Ф6): run this external call through the BullMQ queue with rate-limit + retries
  // instead of calling Apollo synchronously inside the request.
  async search(query: LeadSearchQuery): Promise<LeadCandidate[]> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'apollo_not_configured',
        message: 'Apollo is not configured. Set APOLLO_API_KEY in the environment.',
      });
    }

    const perPage = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const body: Record<string, unknown> = {
      page: query.page ?? 1,
      per_page: perPage,
    };

    if (query.titles?.length) body.person_titles = query.titles;
    if (query.locations?.length) body.person_locations = query.locations;
    const keywords = [query.keywords, ...(query.companies ?? [])].filter(Boolean).join(' ');
    if (keywords) body.q_keywords = keywords;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/mixed_people/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(`Apollo request failed: ${this.errorMessage(error)}`);
      throw new ServiceUnavailableException({
        code: 'apollo_provider_unavailable',
        message: 'Apollo request failed.',
      });
    }

    if (!response.ok) {
      this.logger.warn(`Apollo responded with status ${response.status}`);
      throw new ServiceUnavailableException({
        code: 'apollo_provider_error',
        message: `Apollo request failed with status ${response.status}.`,
      });
    }

    const data = (await response.json()) as { people?: ApolloPerson[] };
    return (data.people ?? []).map((person) => this.toCandidate(person));
  }

  private toCandidate(person: ApolloPerson): LeadCandidate {
    const email = normalizeEmail(person.email);
    return {
      email: email && email !== LOCKED_EMAIL ? email : undefined,
      firstName: cleanString(person.first_name),
      lastName: cleanString(person.last_name),
      company: cleanString(person.organization?.name),
      position: cleanString(person.title),
      phone: cleanString(person.phone_numbers?.[0]?.sanitized_number),
      metadata: {
        apolloId: person.id,
        linkedinUrl: person.linkedin_url,
        website: person.organization?.website_url,
      },
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

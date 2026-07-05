import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  path: string;
  timestamp: string;
}

/**
 * Converts any thrown error into a single, predictable JSON envelope.
 * Keeps internal details out of 5xx responses while logging them server-side.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const envelope: ErrorEnvelope = {
      statusCode: status,
      error: HttpStatus[status] ?? 'ERROR',
      ...this.extractMessage(exception, status),
      path: request?.url ?? '',
      timestamp: new Date().toISOString(),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request?.method ?? ''} ${envelope.path} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    void response.status(status).send(envelope);
  }

  private extractMessage(
    exception: unknown,
    status: number,
  ): { message: string | string[]; code?: string } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return { message: body };
      }

      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        return {
          message: (record.message as string | string[]) ?? exception.message,
          code: typeof record.code === 'string' ? record.code : undefined,
        };
      }

      return { message: exception.message };
    }

    // Never leak internal error text on 5xx.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return { message: 'Internal server error' };
    }

    return { message: exception instanceof Error ? exception.message : 'Unexpected error' };
  }
}

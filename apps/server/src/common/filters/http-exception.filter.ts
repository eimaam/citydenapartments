import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'An unexpected error occurred';
    let errorDetail: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = (res as any).message || message;
        errorDetail = (res as any).error;
      }

      this.logger.warn(
        `${request.method} ${request.url} → ${status} — ${Array.isArray(message) ? message.join('; ') : message}`,
      );
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetail = process.env.NODE_ENV === 'production' ? undefined : exception.stack;

      this.logger.error(
        `${request.method} ${request.url} → ${status} — ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown exception at ${request.method} ${request.url}`, exception);
    }

    const body: Record<string, any> = {
      success: false,
      message: Array.isArray(message) ? message.join('; ') : message,
    };

    if (errorDetail) {
      body.error = errorDetail;
    }

    response.status(status).json(body);
  }
}

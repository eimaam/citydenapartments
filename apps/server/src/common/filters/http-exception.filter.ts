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
    let message: string = 'We experienced an error processing your request. Please try again.';
    let logMessage: string = '';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && Array.isArray((res as any).message)) {
        logMessage = `Validation error: ${(res as any).message.join('; ')}`;
        message = 'Please check your input and try again.';
      } else if (typeof res === 'string') {
        logMessage = res;
        message = res;
      } else if (typeof res === 'object') {
        logMessage = (res as any).message || message;
        message = logMessage;
      }

      this.logger.warn(`${request.method} ${request.url} → ${status} — ${logMessage}`);
    } else if (exception instanceof Error) {
      logMessage = exception.message;
      if (status >= 500) {
        message = 'Something went wrong. Please try again.';
      }

      this.logger.error(
        `${request.method} ${request.url} → ${status} — ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown exception at ${request.method} ${request.url}`, exception);
    }

    response.status(status).json({ success: false, message });
  }
}

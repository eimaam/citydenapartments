import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

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
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetail = process.env.NODE_ENV === 'production' ? undefined : exception.stack;
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

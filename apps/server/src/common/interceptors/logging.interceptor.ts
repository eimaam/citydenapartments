import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url } = request;
    const user = (request as any).user;
    const identity = user?.email || user?.id || 'anonymous';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.log(`${method} ${url} ${response.statusCode} ${duration}ms — ${identity}`);
        },
        error: () => {
          const duration = Date.now() - now;
          this.logger.warn(`${method} ${url} ${response.statusCode} ${duration}ms — ${identity}`);
        },
      }),
    );
  }
}

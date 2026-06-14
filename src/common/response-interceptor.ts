import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return {
          success: true,
          data: data ?? null,
          message:
            context.switchToHttp().getRequest().method === 'POST'
              ? 'Recurso criado com sucesso'
              : 'Operação realizada com sucesso',
          errors: null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

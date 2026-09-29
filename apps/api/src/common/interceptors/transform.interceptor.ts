import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@pulsetime/types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    // If returning a stream or raw file, skip wrapping
    const response = context.switchToHttp().getResponse();
    if (response.getHeader('Content-Type')?.toString().includes('text/csv')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((res) => {
        // If already structured with data and meta
        if (res && typeof res === 'object' && 'data' in res && !('error' in res)) {
          return {
            success: true,
            data: res.data,
            meta: res.meta || undefined,
          };
        }

        // If explicitly set { success: true }
        if (res && typeof res === 'object' && res.success !== undefined) {
          return res;
        }

        return {
          success: true,
          data: res !== undefined ? res : null,
        };
      }),
    );
  }
}

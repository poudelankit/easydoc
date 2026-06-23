import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable, catchError, tap, throwError } from "rxjs";
import { writeStructuredLog } from "./structured-logger";

interface RequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: {
    id?: string;
    role?: string;
  };
}

interface ResponseLike {
  statusCode?: number;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const response = context.switchToHttp().getResponse<ResponseLike>();
    const startedAt = Date.now();
    const method = request.method ?? "UNKNOWN";
    const path = request.originalUrl ?? request.url ?? "unknown";

    writeStructuredLog("info", "http.request.started", {
      method,
      path,
      ipAddress: request.ip,
      userId: request.user?.id,
      userRole: request.user?.role,
      userAgent: request.headers?.["user-agent"]
    });

    return next.handle().pipe(
      tap(() => {
        writeStructuredLog("info", "http.request.completed", {
          method,
          path,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          userId: request.user?.id,
          userRole: request.user?.role
        });
      }),
      catchError((error: unknown) => {
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;
        writeStructuredLog(statusCode >= 500 ? "error" : "warn", "http.request.failed", {
          method,
          path,
          statusCode,
          durationMs: Date.now() - startedAt,
          userId: request.user?.id,
          userRole: request.user?.role,
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        return throwError(() => error);
      })
    );
  }
}

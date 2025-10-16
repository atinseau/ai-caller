import { Injectable } from "@nestjs/common";
import { HttpInterceptor, type InterceptorNextFunction } from "../http-interceptor";
import { tap } from "rxjs";
import { Logger } from "@/utils/services/logger";

@Injectable()
export class RequestInterceptor implements HttpInterceptor {

  constructor(
    private readonly logger: Logger
  ) {}

  intercept(req: Bun.BunRequest, next: InterceptorNextFunction) {
    const t = performance.now();
    this.logger.log(`Request [${req.method}] ${req.url} started at ${new Date().toISOString()}`, 'RequestInterceptor');
    return next().pipe(
      tap(() => {
        const elapsed = (performance.now() - t).toFixed(2);
        this.logger.log(`Request [${req.method}] ${req.url} completed in ${elapsed}ms at ${new Date().toISOString()}`, 'RequestInterceptor');
      })
    )
  }
}

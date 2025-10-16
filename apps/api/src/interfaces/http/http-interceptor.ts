import type { BunRequest } from "bun";
import type { Observable } from "rxjs"

export type InterceptorNextFunction<T = any> = () => Observable<T>

export class HttpInterceptor {
  intercept(req: BunRequest, next: InterceptorNextFunction): Observable<Response> | Promise<Observable<Response>> {
    return next();
  }
}

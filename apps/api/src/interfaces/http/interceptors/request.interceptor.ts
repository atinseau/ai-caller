import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "nest-bun/common";

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    console.log('Interceptor')
    return next.handle()
  }
}

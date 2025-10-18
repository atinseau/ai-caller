import type { Type } from "@nestjs/common";
import type { MiddlewareConfigProxy } from "./middleware-config-proxy.interfaces";
import type { NestMiddleware } from "./nest-middleware.interfaces";

export interface MiddlewareConsumer {
  // TODO: Add function type later
  apply(...middlewares: Type<NestMiddleware>[]): MiddlewareConfigProxy
}

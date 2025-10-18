export * from "@nestjs/common"

export * from "./decorators/use-middleware.decorator"

// Override
import type { NestMiddleware } from "./interfaces/nest-middleware.interfaces"
import type { MiddlewareConsumer } from "./interfaces/middleware-consumer.interfaces"
import type { NestModule } from "./interfaces/nest-module.interfaces"

export {
  type NestMiddleware,
  type MiddlewareConsumer,
  type NestModule
}

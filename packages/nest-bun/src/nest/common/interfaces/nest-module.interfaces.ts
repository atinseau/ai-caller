import type { MiddlewareConsumer } from "./middleware-consumer.interfaces";

export interface NestModule {
    configure(consumer: MiddlewareConsumer): any;
}

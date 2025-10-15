import { Module } from "@nestjs/common";
import { HttpRouter } from "./http-router";
import { RequestMiddleware } from "./middlewares/request.middleware";

const SERVICES = [
  HttpRouter
]

const MIDDLEWARES = [
  RequestMiddleware
]

const PROVIDERS = [
  ...SERVICES,
  ...MIDDLEWARES
]

@Module({
  providers: PROVIDERS,
  exports: PROVIDERS
})
export class HttpModule { }

import { Module } from "@nestjs/common";
import { HttpRouter } from "./http-router";

const SERVICES = [
  HttpRouter
]

const PROVIDERS = [
  ...SERVICES
]

@Module({
  providers: PROVIDERS,
  exports: PROVIDERS
})
export class HttpModule { }

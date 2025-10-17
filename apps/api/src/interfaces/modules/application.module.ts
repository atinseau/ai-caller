import { Module } from "nest-bun/common";
import { ApplicationController } from "../controllers/application.controller";


@Module({
  controllers: [ApplicationController],
  providers: []
})
export class ApplicationModule { }

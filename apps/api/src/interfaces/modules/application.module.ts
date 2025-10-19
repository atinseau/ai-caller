import { Module } from "nest-bun/common";
import { ApplicationController } from "../controllers/application.controller";
import { AudioStreamController } from "../controllers/audio-stream.controller";

@Module({
  controllers: [
    ApplicationController,
    AudioStreamController
  ],
  providers: []
})
export class ApplicationModule {}

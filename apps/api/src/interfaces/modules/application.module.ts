import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from "nest-bun/common";
import { ApplicationController } from "../controllers/application.controller";
import { AudioStreamController } from "../controllers/audio-stream.controller";
import { RequestMiddleware } from "../http/middlewares/request.middleware";

@Module({
  controllers: [
    ApplicationController,
    AudioStreamController
  ],
  providers: []
})
export class ApplicationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestMiddleware)
      .forRoutes(
        ApplicationController,
        { controller: AudioStreamController, method: 'handle' }
      )
  }
}

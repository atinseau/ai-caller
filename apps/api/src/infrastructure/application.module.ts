import { ApplicationHandler } from "@/interfaces/handlers/application.handler";
import { AudioStreamUpgradeHandler } from "@/interfaces/handlers/http/audio-stream-upgrade.handler";
import { Module } from "@nestjs/common";

@Module({
  providers: [
    ApplicationHandler,
    AudioStreamUpgradeHandler
  ]
})
export class ApplicationModule { }

import { Global, Module } from "@nestjs/common";
import { ApplicationHandler } from "./http/application.handler";
import { AudioStreamUpgradeHandler } from "./http/audio-stream-upgrade.handler";

const PROVIDERS = [
  ApplicationHandler,
  AudioStreamUpgradeHandler
]

@Module({
  providers: PROVIDERS,
  exports: PROVIDERS
})
export class HandlersModule { }

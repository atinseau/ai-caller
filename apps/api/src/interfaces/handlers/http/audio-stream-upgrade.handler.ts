import type { Routes } from "@/interfaces/enums/routes.enum";
import type { BunRequest } from "bun";
import { Injectable } from "@nestjs/common";


@Injectable()
export class AudioStreamUpgradeHandler {
  handle(req: BunRequest<Routes.AUDIO_STREAM_UPGRADE>, server: Bun.Server) {
    if (server.upgrade(req)) {
      return
    }
    return new Response("Upgrade Required", { status: 426 });
  }
}

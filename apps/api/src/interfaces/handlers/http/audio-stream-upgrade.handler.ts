import { Injectable } from "@nestjs/common";
import { UseMiddleware } from "@/utils/decorators/use-middleware.decorator";
import { RequestMiddleware } from "@/interfaces/http/middlewares/request.middleware";
import type { Routes } from "@/interfaces/enums/routes.enum";
import type { BunRequest } from "bun";

@Injectable()
export class AudioStreamUpgradeHandler {

  @UseMiddleware(RequestMiddleware)
  handle(req: BunRequest<Routes.AUDIO_STREAM_UPGRADE>, server: Bun.Server<any>) {
    if (server.upgrade(req)) {
      return
    }
    return new Response("Upgrade Required", { status: 426 });
  }
}

import { Controller, UseInterceptors } from "nest-bun/common";
import type { Routes } from "@/interfaces/enums/routes.enum";
import type { BunRequest } from "bun";
import { RequestInterceptor } from "@/interfaces/http/interceptors/request.interceptor";

@Controller()
export class AudioStreamController {

  @UseInterceptors(RequestInterceptor)
  handle(req: BunRequest<Routes.AUDIO_STREAM_UPGRADE>, server: Bun.Server<any>) {
    if (server.upgrade(req)) {
      return
    }
    return new Response("Upgrade Required", { status: 426 });
  }
}

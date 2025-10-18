import { Controller, Get, UseInterceptors, UseMiddleware } from "nest-bun/common";
import { Routes } from "@/interfaces/enums/routes.enum";
import type { BunRequest } from "bun";
import { RequestInterceptor } from "@/interfaces/http/interceptors/request.interceptor";
import { RequestMiddleware } from "../http/middlewares/request.middleware";

@Controller()
// @UseMiddleware(RequestMiddleware)
export class AudioStreamController {

  @Get(Routes.AUDIO_STREAM_UPGRADE)
  @UseInterceptors(RequestInterceptor)
  handle(req: BunRequest, server: Bun.Server<any>) {
    if (server.upgrade(req)) {
      return
    }
    return new Response("Upgrade Required", { status: 426 });
  }


  bonjour() {

  }
}

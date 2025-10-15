import type { BunRequest } from "bun";
import type { Routes } from "../../enums/routes.enum";
import { Injectable, UseInterceptors } from "@nestjs/common";
import { UseMiddleware } from "@/utils/decorators/use-middleware.decorator";
import { RequestMiddleware } from "@/interfaces/http/middlewares/request.middleware";

@UseMiddleware(RequestMiddleware)
@Injectable()
export class ApplicationHandler {

  @UseInterceptors()
  handle(req: BunRequest<Routes.INDEX>) {
    return new Response("Hello, World!");
  }
}

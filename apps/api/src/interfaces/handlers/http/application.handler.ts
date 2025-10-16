import type { BunRequest } from "bun";
import type { Routes } from "../../enums/routes.enum";
import { Injectable, UseInterceptors } from "@nestjs/common";
import { RequestInterceptor } from "@/interfaces/http/interceptors/request.interceptor";

@Injectable()
export class ApplicationHandler {

  @UseInterceptors(RequestInterceptor)
  handle(req: BunRequest<Routes.INDEX>) {
    console.log("Handling request in ApplicationHandler");

    throw new Error("Test error in ApplicationHandler");

    return new Response("Hello, World!");
  }
}

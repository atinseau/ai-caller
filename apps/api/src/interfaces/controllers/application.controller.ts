import { Controller, Get, Post, UseInterceptors, UseMiddleware } from "nest-bun/common";
import { RequestInterceptor } from "@/interfaces/http/interceptors/request.interceptor";
import { RequestMiddleware } from "../http/middlewares/request.middleware";

@Controller()
// @UseMiddleware(RequestMiddleware)
export class ApplicationController {
  @Get('/')
  @UseInterceptors(RequestInterceptor)
  handle() {
    // console.log("Handling request in ApplicationHandler");
    // throw new Error("Test error in ApplicationHandler");
    return new Response("Salut, World!");
  }

  @Post('/test')
  postTest() {
    return new Response("Post request received!");
  }
}

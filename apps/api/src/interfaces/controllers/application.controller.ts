import { Body, Controller, Get, Post, Query, UseInterceptors, UseMiddleware } from "nest-bun/common";
import { RequestInterceptor } from "@/interfaces/http/interceptors/request.interceptor";
import { RequestMiddleware } from "../http/middlewares/request.middleware";

@Controller()
@UseMiddleware(RequestMiddleware)
export class ApplicationController {
  @Get('/')
  @UseInterceptors(RequestInterceptor)
  handle(@Body() body: any, @Query() query: any) {

    console.log(query)

    console.log("Handling request in ApplicationHandler");
    throw new Error("Test error in ApplicationHandler");
    return new Response("Salut, World!");
  }

  @Post('/test')
  postTest() {
    return new Response("Post request received!");
  }
}

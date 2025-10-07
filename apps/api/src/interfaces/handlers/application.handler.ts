import { Injectable } from "@nestjs/common";
import type { BunRequest } from "bun";
import type { Routes } from "../enums/routes.enum";

@Injectable()
export class ApplicationHandler {
  handle(req: BunRequest<Routes.INDEX>) {
    return new Response("Hello, World!");
  }
}

import type { BunRequest } from "bun";
import { Injectable, type NestMiddleware } from "nest-bun/common";

@Injectable()
export class RequestMiddleware implements NestMiddleware {

  constructor() {
    console.log('RequestMiddleware initialized')
  }

  use(req: BunRequest, next: () => void) {
    console.log('Middleware')
    next()
  }
}

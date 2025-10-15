import { Injectable } from "@nestjs/common";
import { Logger } from "@/utils/services/logger";
import type { HttpMiddleware } from "../http-middleware";
import type { BunRequest } from "bun";

@Injectable()
export class RequestMiddleware implements HttpMiddleware {
  constructor(
    private readonly logger: Logger
  ) { }

  use(req: BunRequest, next: () => void) {
    this.logger.log(`[${req.method}] ${req.url}`);
    next()
  }
}

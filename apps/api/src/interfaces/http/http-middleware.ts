import type { BunRequest } from "bun";

export class HttpMiddleware {
  use(req: BunRequest, next: () => void): Promise<void> | void {
    next();
  }
}

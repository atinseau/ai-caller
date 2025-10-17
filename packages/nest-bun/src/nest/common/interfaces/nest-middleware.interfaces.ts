import type { BunRequest } from "bun";

export interface NestMiddleware {
  /**
   * Method called before the route handler is executed.
   *
   * @param {BunRequest} req - The incoming request object.
   * @param {Function} next - The function to call to pass control to the next middleware or route handler.
   *
   * @returns {void | Promise<void>} - Can return void or a Promise that resolves to void.
   * @throws {Error | Response}
   */
  use(req: BunRequest, next: () => void): void | Promise<void>
}

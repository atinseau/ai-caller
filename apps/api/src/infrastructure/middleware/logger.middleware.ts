import type { MiddlewareHandler } from "hono";
import { logger } from "../logger";

export const loggerMiddleware: MiddlewareHandler = async (ctx, next) => {
  logger.info(`[${ctx.req.method}] ${ctx.req.url}`);
  await next();
};

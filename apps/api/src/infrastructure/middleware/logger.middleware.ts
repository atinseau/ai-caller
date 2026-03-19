import type { MiddlewareHandler } from "hono";
import { logger } from "../logger/index.ts";

export const loggerMiddleware: MiddlewareHandler = async (ctx, next) => {
  logger.info(`[${ctx.req.method}] ${ctx.req.url}`);
  await next();
};

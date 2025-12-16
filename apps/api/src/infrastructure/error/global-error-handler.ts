import z, { ZodError } from "zod"
import { HTTPException } from "hono/http-exception"
import type { ErrorHandler } from "hono"
import { PrismaClientKnownRequestError } from "@/generated/prisma/internal/prismaNamespace"
import { logger } from "../logger"

export const globalErrorHandler: ErrorHandler = (error, ctx) => {
  logger.error(error)

  if (error instanceof ZodError) {
    return ctx.json(z.treeifyError(error), 400)
  }
  if (error instanceof HTTPException) {
    return error.getResponse()
  }

  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return ctx.json({ message: 'Unique constraint failed', meta: error.meta }, 409)
      default:
        return ctx.json({ message: 'Database error', meta: error.meta }, 500)
    }
  }

  return ctx.json({ message: error.message }, 500)
}

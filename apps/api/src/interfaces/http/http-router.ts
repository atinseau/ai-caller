import type { MethodsOf } from "@/types";
import { MIDDLEWARE_METADATA_KEY } from "@/utils/constants";
import { bind } from "@/utils/functions/bind";
import { Injectable, type Type } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { HttpMiddleware } from "./http-middleware";
import type { BunRequest } from "bun";

@Injectable()
export class HttpRouter {

  constructor(
    private readonly moduleRef: ModuleRef
  ) { }

  public createHandler<TInput extends object, TMethod extends MethodsOf<TInput>>(
    input: Type<TInput>,
    method: TMethod
  ) {
    const instance = this.moduleRef.get(input, { strict: false })
    if (!instance) {
      throw new Error(`Handler ${input.name} not found in moduleRef`)
    }
    const handler = bind(instance, method);
    const middlewaresInstances = this.getMiddlewares(instance, handler);

    return async (req: BunRequest) => {
      for (const middleware of middlewaresInstances) {
        const result = await this.executeMiddleware(req, middleware);
        if (result instanceof Response) {
          return result;
        }
      }
      return handler(req)
    }
  }

  private async executeMiddleware(req: BunRequest, middleware: HttpMiddleware) {
    try {
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      }

      await middleware.use(req, next);
      if (!nextCalled) {
        return new Response("Request blocked by middleware", { status: 403 });
      }
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  private getMiddlewares(instance: object, handler: Function) {
    const middlewares = [
      ...Reflect.getMetadata(MIDDLEWARE_METADATA_KEY, handler) as typeof HttpMiddleware[] || [],
      ...Reflect.getMetadata(MIDDLEWARE_METADATA_KEY, instance.constructor) as typeof HttpMiddleware[] || [],
    ]
    const middlewaresInstances = middlewares.map((Middleware) => {
      if (!this.moduleRef.get(Middleware)) {
        this.moduleRef.create(Middleware);
      }
      return this.moduleRef.get(Middleware);
    })
    return middlewaresInstances;
  }
}

import { Injectable, Logger, Optional, type ExecutionContext, type NestInterceptor, type OnApplicationBootstrap, type Type } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { INTERCEPTORS_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { MIDDLEWARE_METADATA_KEY } from "../lib/constants";
import { Observable, Subscriber } from "rxjs";
import { bind } from "../lib/functions/bind";
import type { BunRequest } from "bun";
import type { MethodsOf } from "../types/methods-of.types";
import type { ControllerHandler } from "../types/controller-handler.types";
import type { NestMiddleware } from "../nest/common";

@Injectable()
export class RouterHandler implements OnApplicationBootstrap {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly logger: Logger = new Logger(RouterHandler.name)
  ) { }

  onApplicationBootstrap() {
    this.logger.log("HttpRouter initialized");
  }

  public async createHandler<TInput extends object, TMethod extends MethodsOf<TInput>>(
    input: Type<TInput>,
    method: TMethod
  ): Promise<Bun.Serve.Handler<BunRequest, Bun.Server<any>, Response>> {
    const controller = this.moduleRef.get(input.constructor, { strict: false }) as TInput
    if (!controller) {
      throw new Error(`Handler ${input.name} not found in moduleRef`)
    }

    const handler = bind(controller, method) as unknown as ControllerHandler
    const [
      middlewaresInstances,
      interceptorsInstances
    ] = await Promise.all([
      this.getMiddlewares(controller, handler),
      this.getInterceptors(handler)
    ]);

    return async (req, server) => {
      for (const middleware of middlewaresInstances) {
        const result = await this.executeMiddleware(req, middleware);
        if (result instanceof Response) {
          return result;
        }
      }

      const context = this.createExecutionContext(req, server, input, handler);

      const composed = interceptorsInstances.reduceRight(
        (next, interceptor) => this.handleInterceptorExecution.bind(
          this,
          interceptor,
          context as ExecutionContext, // TODO: fix this cast
          next
        ),
        () => new Observable<Response>((sub) => this.handleRequestExecution(req, server, controller, handler, sub))
      );

      // Await the result of the composed interceptors and return the Response
      return await new Promise<Response>((resolve) => composed().subscribe({
        next: resolve,
        error: (error) => {
          this.logger.error(error, 'HttpRouter');
          resolve(new Response("Internal Server Error", { status: 500 }));
        },
      }));
    }
  }

  private createExecutionContext(req: BunRequest, server: Bun.Server<any>, controller: Type, handler: Function): Partial<ExecutionContext> {
    return {
      getClass: () => controller,
      getHandler: () => handler,
      getType: () => 'http',
      getServer: () => server,
      switchToHttp: () => ({
        getRequest: () => req
      }),
      switchToWs: () => {
        throw new Error("Not implemented")
      },
      switchToRpc: () => {
        throw new Error("Not implemented")
      },
    }
  }

  private handleInterceptorExecution(interceptor: NestInterceptor, context: ExecutionContext, next: () => Observable<Response>) {
    const result = interceptor.intercept(context, { handle: next });
    if (result instanceof Observable) {
      return result;
    } else if (result instanceof Promise) {
      return new Observable<Response>((sub) => {
        result
          .then((res) => res.subscribe(sub))
          .catch((err) => sub.error(err));
      });
    } else {
      throw new Error("Interceptor.intercept must return Observable<Response> or Promise<Observable<Response>>");
    }
  }

  private handleRequestExecution(req: BunRequest, server: Bun.Server<any>, controller: Type<any>, handler: Function, sub: Subscriber<Response>) {
    try {

      const routeArgsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller.constructor, 'handler') || {};

      console.log(routeArgsMetadata)

      const maybePromise = handler();
      if (maybePromise instanceof Promise) {
        maybePromise
          .then((result) => {
            if (result instanceof Observable) {
              result.subscribe(sub);
            } else {
              sub.next(result);
              sub.complete();
            }
          })
          .catch((err) => sub.error(err));
      } else if (maybePromise instanceof Observable) {
        maybePromise.subscribe(sub);
      } else {
        sub.next(maybePromise);
        sub.complete();
      }

    } catch (err) {
      sub.error(err);
    }
  }

  private async executeMiddleware(req: BunRequest, middleware: NestMiddleware) {
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

  private getProviders<T extends Type>(constructors: T[]) {
    return constructors.map((Constructor) => this.moduleRef.get(Constructor, { strict: false })) as InstanceType<T>[];
  }

  private async getInterceptors(handler: Function) {
    const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, handler) as Type<NestInterceptor>[] || []
    return this.getProviders(interceptors);
  }

  private getMiddlewares(controller: object, handler: Function) {
    const middlewares = [
      ...Reflect.getMetadata(MIDDLEWARE_METADATA_KEY, handler) as Type<NestMiddleware>[] || [],
      ...Reflect.getMetadata(MIDDLEWARE_METADATA_KEY, controller.constructor) as Type<NestMiddleware>[] || [],
    ]
    return this.getProviders(middlewares)
  }
}

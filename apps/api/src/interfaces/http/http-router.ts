import type { MethodsOf } from "@/types";
import { MIDDLEWARE_METADATA_KEY } from "@/utils/constants";
import { bind } from "@/utils/functions/bind";
import { Injectable, type OnApplicationBootstrap, type Type } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { HttpMiddleware } from "./http-middleware";
import type { BunRequest } from "bun";
import type { HttpInterceptor } from "./http-interceptor";
import { INTERCEPTORS_METADATA } from "@nestjs/common/constants";
import { Observable, Subscriber } from "rxjs";
import { Logger } from "@/utils/services/logger";

@Injectable()
export class HttpRouter implements OnApplicationBootstrap {

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly logger: Logger
  ) { }

  onApplicationBootstrap() {
    this.logger.log("HttpRouter initialized", 'HttpRouter');
  }

  public async createHandler<TInput extends object, TMethod extends MethodsOf<TInput>>(
    input: Type<TInput>,
    method: TMethod
  ) {
    const instance = this.moduleRef.get(input, { strict: false })
    if (!instance) {
      throw new Error(`Handler ${input.name} not found in moduleRef`)
    }
    const handler = bind(instance, method) as unknown as (req: BunRequest) =>
      | Response
      | Promise<Response>
      | Observable<Response>
      | Promise<Observable<Response>>

    const [
      middlewaresInstances,
      interceptorsInstances
    ] = await Promise.all([
      this.getMiddlewares(instance, handler),
      this.getInterceptors(handler)
    ]);

    return async (req: BunRequest, server: Bun.Server<any>) => {
      for (const middleware of middlewaresInstances) {
        const result = await this.executeMiddleware(req, middleware);
        if (result instanceof Response) {
          return result;
        }
      }

      const handlerObservable = () => new Observable<Response>((sub) => this.handleRequestExecution(req, server, handler, sub));

      const composed = interceptorsInstances.reduceRight(
        (next, interceptor) => () => {
          const result = interceptor.intercept(req, next);
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
        },
        handlerObservable
      );

      // Await the result of the composed interceptors and return the Response
      return await new Promise<Response>((resolve) => composed().subscribe({
        next: resolve,
        error: (error) => {
          this.logger.error(`Error processing request: ${error.message}`, error.stack, 'HttpRouter');
          resolve(new Response("Internal Server Error", { status: 500 }));
        },
      }));
    }
  }

  private handleRequestExecution(req: BunRequest, server: Bun.Server<any>, handler: Function, sub: Subscriber<Response>) {
    try {
      const maybePromise = handler(req, server);
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

  private dynamicInjection<T extends Type>(constructors: T[]) {
    const instancesPromise = constructors.map(async (Constructor) => {
      if (!this.moduleRef.get(Constructor, { strict: false })) {
        await this.moduleRef.create(Constructor);
      }
      return this.moduleRef.get(Constructor, { strict: false }) as InstanceType<T>;
    })
    return Promise.all(instancesPromise);
  }

  private async getInterceptors(handler: Function) {
    return this.dynamicInjection(
      Reflect.getMetadata(INTERCEPTORS_METADATA, handler) as typeof HttpInterceptor[] || []
    );
  }

  private getMiddlewares(instance: object, handler: Function) {
    return this.dynamicInjection([
      ...Reflect.getMetadata(MIDDLEWARE_METADATA_KEY, handler) as typeof HttpMiddleware[] || [],
      ...Reflect.getMetadata(MIDDLEWARE_METADATA_KEY, instance.constructor) as typeof HttpMiddleware[] || [],
    ])
  }
}

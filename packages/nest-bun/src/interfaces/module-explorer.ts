import { UseMiddleware, type MiddlewareConsumer, type NestMiddleware, type NestModule } from "../nest/common";
import { type Type } from "@nestjs/common";
import type { Route } from "../nest/common/interfaces/middleware-config-proxy.interfaces";

export class ModuleExplorer {

  async applyMiddlewares(module: NestModule) {
    const modules: any[] = []

    for (const module of modules) {

      console.log(module)

      if (!('configure' in module)) {
        continue
      }
      console.log(module)
      await this.executeConfigure(module as NestModule)
    }
  }

  private async executeConfigure(moduleInstance: NestModule) {
    const detectedMiddlewares: Type<NestMiddleware>[] = []
    const controllersWithMethods = new Map<Type<any>, string[]>()
    const controllers = new Set<Type<any>>()

    const consumer: MiddlewareConsumer = {
      apply: (...middlewares) => {
        detectedMiddlewares.push(...middlewares)
        return {
          forRoutes: (...routes) => {
            for (const route of routes as unknown as Route[]) {
              if ('controller' in route && 'method' in route) {
                if (!controllersWithMethods.has(route.controller)) {
                  controllersWithMethods.set(route.controller, [])
                }
                controllersWithMethods.set(route.controller, [
                  ...controllersWithMethods.get(route.controller) || [],
                  route.method
                ])
              } else {
                controllers.add(route)
              }
            }
          },
          exclude: (...routes) => {
            for (const route of routes as unknown as Route[]) {
              if ('controller' in route && 'method' in route) {
                const methods = controllersWithMethods.get(route.controller) || []
                if (methods.includes(route.method)) {
                  const filteredMethods = methods.filter(m => m !== route.method)
                  if (filteredMethods.length > 0) {
                    controllersWithMethods.set(route.controller, filteredMethods)
                  } else {
                    controllersWithMethods.delete(route.controller)
                  }
                }
              } else {
                controllers.delete(route)
              }
            }
          }
        }
      }
    }
    await moduleInstance.configure(consumer)

    for (const controller of controllers) {
      UseMiddleware(...detectedMiddlewares)(controller)
    }


  }
}

import { join } from "path"
import { Injectable, Logger, Optional, RequestMethod } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { RouterHandler } from "./router-handler";
import type { ClassType } from "../types/class.types";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { getClassMethods } from "../lib/functions/get-class-methods";

@Injectable()
export class RouterExplorer {

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly routerHandler: RouterHandler,
    @Optional() private readonly logger = new Logger(RouterExplorer.name)
  ) { }

  explore(): Promise<Bun.Serve.Routes<any, string>> {
    const controllers = this.discoveryService.getControllers()
    return this.mapControllersToRoutes(controllers.map((wrapper) => wrapper.instance))
  }

  private async mapControllersToRoutes(controllers: ClassType[]): Promise<Bun.Serve.Routes<any, string>> {
    const routes: Bun.Serve.Routes<any, string> = {}

    for (const controller of controllers) {
      const methods = getClassMethods(controller)
      for (const method of methods) {
        const httpMethodFlag = Reflect.getMetadata(METHOD_METADATA, controller[method])
        const httpPath = Reflect.getMetadata(PATH_METADATA, controller[method]) || "/"
        const controllerPath = Reflect.getMetadata(PATH_METADATA, controller.constructor) || ""

        const httpMethod = RequestMethod[httpMethodFlag as keyof typeof RequestMethod] as unknown as Bun.Serve.HTTPMethod
        if (!httpMethod) {
          this.logger.warn(`No HTTP method found for ${controller.constructor.name}.${method}`)
          continue
        }

        const path = join("/", controllerPath, httpPath).replace(/\\/g, "/")

        if (!routes[path]) {
          routes[path] = {}
        }

        // Bypass bun routes type checking
        // because it doesn't support dynamic methods
        (routes[path] as any)[httpMethod] = await this.routerHandler.createHandler(controller, method)
        this.logger.log(`Mapping [${httpMethod}] ${path} to ${controller.constructor.name}.${method}`)
      }
    }
    return routes
  }

}

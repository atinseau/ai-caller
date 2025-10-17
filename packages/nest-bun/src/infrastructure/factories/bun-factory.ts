import type { Provider } from "@nestjs/common";
import type { ModuleType } from "../../types/module.types";
import type { FactoryOptions } from "../../types/factory-options.types";
import { DiscoveryModule, NestFactory } from "@nestjs/core";
import { IMPORTS_METADATA_KEY, PORT_METADATA_KEY, PROVIDER_METADATA_KEY } from "../../lib/constants";
import { ApplicationBootstrap } from "../application-bootstrap";
import { RouterExplorer } from "../../interfaces/router-explorer";
import { RouterHandler } from "../../interfaces/router-handler";

const PROVIDERS = [
  ApplicationBootstrap,
  RouterExplorer,
  RouterHandler
]

export class BunFactory {
  static async create(module: ModuleType, options?: FactoryOptions) {
    this.inject(module, options)
    const app = await NestFactory.createApplicationContext(module, options)
    return app
  }

  private static inject(module: ModuleType, options?: FactoryOptions) {
    const existingProvider: Provider[] = Reflect.getMetadata(PROVIDER_METADATA_KEY, module) || []
    const existingImports: ModuleType[] = Reflect.getMetadata(IMPORTS_METADATA_KEY, module) || []

    existingProvider.push(
      ...PROVIDERS,
      ...(options?.port ? [
        {
          provide: PORT_METADATA_KEY,
          useValue: options.port
        }
      ] : [])
    )
    existingImports.push(DiscoveryModule)

    Reflect.defineMetadata(IMPORTS_METADATA_KEY, existingImports, module)
    Reflect.defineMetadata(PROVIDER_METADATA_KEY, existingProvider, module)
  }
}

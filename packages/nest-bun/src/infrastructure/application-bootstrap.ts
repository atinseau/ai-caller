import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleInit } from "@nestjs/common";
import { RouterExplorer } from "../interfaces/router-explorer";
import { ModuleRef } from "@nestjs/core";
import { PORT_METADATA_KEY } from "../lib/constants";
import type { CreateServerOptions } from "../types/create-server-options.types";


@Injectable()
export class ApplicationBootstrap implements OnApplicationBootstrap, OnModuleInit {

  constructor(
    private readonly routerExplorer: RouterExplorer,
    @Inject(PORT_METADATA_KEY) private readonly port: number
  ) { }

  onApplicationBootstrap() {}

  async onModuleInit() {
    const routes = await this.routerExplorer.explore()
    const server = this.createServer({
      routes
    })
  }

  private createServer(options: CreateServerOptions) {
    const server = Bun.serve({
      routes: options.routes,
      port: this.port
    })
    return server
  }
}

// Global overrides for nest-bun
import type { ArgumentsHost, ContextType } from "@nestjs/common";
import type { BunRequest } from "bun";

declare module "@nestjs/common" {

  interface HttpArgumentsHost {
    getRequest(): BunRequest
  }

  interface ExecutionContext {
    getType(): ContextType
    getServer(): Bun.Server<any>
    switchToHttp(): HttpArgumentsHost

    // TODO: implement these properly if needed
    switchToRpc(): never
    switchToWs(): never
  }
}

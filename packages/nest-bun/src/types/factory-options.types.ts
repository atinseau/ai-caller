import type { NestApplicationContextOptions } from "@nestjs/common/interfaces/nest-application-context-options.interface"


export type FactoryOptions = NestApplicationContextOptions & {
  port?: number
}

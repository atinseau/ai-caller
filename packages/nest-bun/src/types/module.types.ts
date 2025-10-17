import type { DynamicModule, ForwardReference, Type } from "@nestjs/common";

export type ModuleType = Type<any> | DynamicModule | ForwardReference

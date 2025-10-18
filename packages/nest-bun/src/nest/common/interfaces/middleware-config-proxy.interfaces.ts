import type { Type } from "@nestjs/common"

type AnyFn = (...args: any[]) => any
type MethodNames<T> = Extract<{ [K in keyof T]: T[K] extends AnyFn ? K : never }[keyof T], string>

export type Route<Ctor extends Type<any> = Type<any>> =
  | Ctor
  | { controller: Ctor, method: MethodNames<InstanceType<Ctor>> }

type NormalizeRoute<R> =
  R extends Type<infer C> ? Type<C> :
  R extends { controller: infer Ctor extends Type<any> } ? { controller: Ctor; method: MethodNames<InstanceType<Ctor>> } :
  never

type Routes<RS extends readonly unknown[]> = RS & { [K in keyof RS]: NormalizeRoute<RS[K]> }

export interface MiddlewareConfigProxy {
  forRoutes<RS extends readonly unknown[]>(...routes: Routes<RS>): void
  exclude<RS extends readonly unknown[]>(...routes: Routes<RS>): void
}

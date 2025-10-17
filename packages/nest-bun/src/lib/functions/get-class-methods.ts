import type { MethodsOf } from "../../types/methods-of.types";

export function getClassMethods<T extends object>(obj: T) {
  return Object
    .getOwnPropertyNames(Object.getPrototypeOf(obj))
    .filter((method) => method !== "constructor" && typeof obj[method as keyof typeof obj] === "function") as Array<MethodsOf<T>>
}

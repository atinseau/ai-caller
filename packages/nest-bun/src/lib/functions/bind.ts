import type { MethodsOf } from "../../types/methods-of.types";

export function bind<T extends object, K extends MethodsOf<T>>(
  thisArg: T,
  methodName: K
): T[K] extends (...args: infer A) => infer R ? (...args: A) => R : never {
  const fn = thisArg[methodName];
  if (typeof fn !== "function") {
    throw new Error(`Property ${String(methodName)} is not a class method`);
  }

  // Create a bound function
  const boundFn = fn.bind(thisArg);

  // Copy metadata from the original method to the bound function
  const metadataKeys = Reflect.getMetadataKeys(fn);
  for (const key of metadataKeys) {
    const metadata = Reflect.getMetadata(key, fn);
    Reflect.defineMetadata(key, metadata, boundFn);
  }

  return boundFn as any;
}

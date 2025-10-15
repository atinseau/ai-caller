import { MIDDLEWARE_METADATA_KEY } from "../constants";
import type { HttpMiddleware } from "@/interfaces/http/http-middleware";

export const UseMiddleware = (...middlewares: (new (...args: any[]) => HttpMiddleware)[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor && descriptor.value) {
      // Method decorator
      Reflect.defineMetadata(MIDDLEWARE_METADATA_KEY, middlewares, descriptor.value);
      return
    }
    // Class decorator
    Reflect.defineMetadata(MIDDLEWARE_METADATA_KEY, middlewares, target);
  };
}

import { MIDDLEWARE_METADATA_KEY } from "../lib/constants";
import type { NestMiddleware } from "../nest/common";

export const UseMiddleware = (...middlewares: (new (...args: any[]) => NestMiddleware)[]) => {
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

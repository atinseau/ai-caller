export function bind<
  T extends object,
  K extends {
    [P in keyof T]: T[P] extends (...args: any[]) => any
      ? P
      : never
  }[keyof T]
>(
  thisArg: T,
  methodName: K,
): T[K] extends (...args: infer A) => infer R ? (...args: A) => R : never {
  const proto = Object.getPrototypeOf(thisArg);
  const fn = thisArg[methodName];
  const isOwnMethod = typeof fn === "function";
  const isPrototypeMethod =
    proto &&
    Object.prototype.hasOwnProperty.call(proto, methodName) &&
    typeof (proto[methodName]) === "function";

  if (!isOwnMethod || !isPrototypeMethod) {
    throw new Error(`Property ${String(methodName)} is not a class method`);
  }

  return fn.bind(thisArg);
}

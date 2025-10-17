

export type MethodsOf<T extends object> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
  ? P
  : never
}[keyof T]

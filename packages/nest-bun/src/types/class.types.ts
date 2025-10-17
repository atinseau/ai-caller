export type ClassType<T = any> = {
  new (...args: any[]): T;
  [key: string]: any;
};

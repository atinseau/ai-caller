export abstract class LoggerPort {
  abstract info(objOrMsg: object | string, msg?: string): void;
  abstract error(objOrMsg: object | string, msg?: string): void;
  abstract warn(objOrMsg: object | string, msg?: string): void;
}

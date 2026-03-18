import { injectable } from "inversify";
import { LoggerPort } from "@/domain/ports/logger.port";
import { logger } from ".";

@injectable()
export class LoggerAdapter extends LoggerPort {
  info(objOrMsg: object | string, msg?: string): void {
    msg ? logger.info(objOrMsg, msg) : logger.info(objOrMsg as string);
  }

  error(objOrMsg: object | string, msg?: string): void {
    msg ? logger.error(objOrMsg, msg) : logger.error(objOrMsg as string);
  }

  warn(objOrMsg: object | string, msg?: string): void {
    msg ? logger.warn(objOrMsg, msg) : logger.warn(objOrMsg as string);
  }
}

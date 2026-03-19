import { injectable } from "inversify";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { logger } from "./index.ts";

@injectable()
export class LoggerAdapter extends LoggerPort {
  info(objOrMsg: object | string, msg?: string): void {
    if (msg) logger.info(objOrMsg, msg);
    else logger.info(objOrMsg as string);
  }

  error(objOrMsg: object | string, msg?: string): void {
    if (msg) logger.error(objOrMsg, msg);
    else logger.error(objOrMsg as string);
  }

  warn(objOrMsg: object | string, msg?: string): void {
    if (msg) logger.warn(objOrMsg, msg);
    else logger.warn(objOrMsg as string);
  }
}

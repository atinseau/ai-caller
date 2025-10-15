import { Global, Module } from "@nestjs/common";
import { Logger } from "./services/logger";

@Global()
@Module({
  providers: [Logger],
  exports: [Logger]
})
export class UtilsModule { }

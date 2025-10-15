import { Module } from "@nestjs/common";
import { HandlersModule } from "../handlers/handlers.module";
import { HttpModule } from "../http/http.module";
import { Logger } from "@/utils/services/logger";
import { UtilsModule } from "@/utils/utils.module";

@Module({
  imports: [
    HandlersModule,
    HttpModule,
    UtilsModule
  ]
})
export class ApplicationModule { }

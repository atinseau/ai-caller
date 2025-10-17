import { ApplicationModule } from "./interfaces/modules/application.module"
import { BunFactory } from "nest-bun"

const app = await BunFactory.create(ApplicationModule, {
  abortOnError: false,
  port: 3000
})

app.init()

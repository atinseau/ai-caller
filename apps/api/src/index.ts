import { ApplicationModule } from "./interfaces/modules/application.module"
import { BunFactory } from "nest-bun"

const PORT = parseInt(Bun.env.PORT)
if (isNaN(PORT)) {
  throw new Error("PORT environment variable is not set or is not a valid number")
}

const app = await BunFactory.create(ApplicationModule, {
  abortOnError: false,
})

app.listen(PORT)

import { Hono } from "hono"
import { cors } from 'hono/cors'

import { openAiRouter } from "./router/openai.router"
import { companyRouter } from "./router/company.router"
import { globalErrorHandler } from "@/infrastructure/error/global-error-handler"

const app = new Hono()

app.use('*', cors())
app.route('/openai', openAiRouter)
app.route('/company', companyRouter)

app.notFound((ctx) => ctx.json({ message: 'Not Found' }, 404))
app.onError(globalErrorHandler)

export {
  app
}

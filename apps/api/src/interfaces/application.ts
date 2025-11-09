import { Hono } from "hono"
import { cors } from 'hono/cors'

import { openAiRouter } from "./router/openai.router"

const app = new Hono()

app.use('*', cors())
app.route('/openai', openAiRouter)

export {
  app
}

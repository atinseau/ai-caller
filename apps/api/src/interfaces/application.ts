import { Hono } from "hono"
import { audioStreamRouter } from "./router/audio-stream.router"

const app = new Hono()

app.route('/audio/stream', audioStreamRouter)

export {
  app
}

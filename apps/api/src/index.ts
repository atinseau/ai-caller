import { NestFactory } from "@nestjs/core"
import { ApplicationModule } from "./interfaces/modules/application.module"
import { Routes } from "./interfaces/enums/routes.enum"
import { bind } from "./utils/functions/bind"
import { AudioStreamUpgradeHandler } from "./interfaces/handlers/http/audio-stream-upgrade.handler"
import { ApplicationHandler } from "./interfaces/handlers/http/application.handler"
import { HttpRouter } from "./interfaces/http/http-router"

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app = await NestFactory.createApplicationContext(ApplicationModule, {
  abortOnError: false
})

const router = app.get(HttpRouter)

Bun.serve({
  port: PORT,
  routes: {
    [Routes.INDEX]: router.createHandler(ApplicationHandler, 'handle'),
    [Routes.AUDIO_STREAM_UPGRADE]: bind(app.get(AudioStreamUpgradeHandler), 'handle')
  },
  websocket: {
    message(ws, message) { },
    open(ws) { },
    close(ws, code, reason) { },
    drain(ws) { }
  },
  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
})

console.log(`🚀 Application is running on: http://localhost:${PORT}`)

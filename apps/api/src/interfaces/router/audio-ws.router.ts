import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port.ts";
import { container } from "@/infrastructure/di/container.ts";

export const audioWsRouter = new Hono();

/**
 * GET /:roomId/audio — WebSocket for bidirectional audio streaming
 * Relays audio between the browser and the audio provider.
 */
audioWsRouter.get(
  "/:roomId/audio",
  upgradeWebSocket((c) => {
    const roomId = c.req.param("roomId") ?? "";
    // Resolve gateway once per connection, not per message
    const gateway = container.get(RealtimeGatewayPort);

    return {
      onOpen(_evt, ws) {
        gateway.registerClientSender(roomId, (message) => {
          try {
            ws.send(JSON.stringify(message));
          } catch {
            /* ws may already be closed */
          }
        });
      },

      onMessage(evt) {
        try {
          const msg = JSON.parse(
            typeof evt.data === "string" ? evt.data : "",
          ) as { type?: string; audio?: string; text?: string };

          if (msg.type === "audio" && msg.audio) {
            gateway.forwardAudioToProvider(roomId, msg.audio);
            return;
          }

          if (msg.type === "text" && msg.text) {
            gateway.sendTextToProvider(roomId, msg.text);
          }
        } catch {
          /* Ignore malformed messages */
        }
      },

      onClose() {
        gateway.unregisterClientSender(roomId);
        gateway.closeRoomChannel(roomId);
      },
    };
  }),
);

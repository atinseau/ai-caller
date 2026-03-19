import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port.ts";
import { TextStreamPort } from "@/domain/ports/text-stream.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { container } from "@/infrastructure/di/container.ts";
import { SendMessageRequestDto } from "../dtos/room/send-message-request.dto.ts";
import { SendMessageResponseDto } from "../dtos/room/send-message-response.dto.ts";

export const messageRouter = new OpenAPIHono();

const RoomIdParam = z.object({
  roomId: z.string().openapi({ description: "Room ID" }),
});

const sendMessageRoute = createRoute({
  method: "post",
  path: "/{roomId}/messages",
  request: {
    params: RoomIdParam,
    body: {
      required: true,
      content: {
        "application/json": { schema: SendMessageRequestDto },
      },
    },
  },
  responses: {
    200: {
      description: "Message sent successfully",
      content: {
        "application/json": { schema: SendMessageResponseDto },
      },
    },
  },
});

messageRouter.openapi(sendMessageRoute, (ctx) => {
  const { roomId } = ctx.req.valid("param");
  const { text } = ctx.req.valid("json");

  const gateway = container.get(RealtimeGatewayPort);

  gateway.sendToRoom(roomId, {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text }],
    },
  } as never);

  gateway.sendToRoom(roomId, {
    type: "response.create",
  } as never);

  return ctx.json({ message: "Message sent" });
});

// GET /api/v1/room/:roomId/stream — SSE stream of real-time session events
messageRouter.get("/:roomId/stream", (ctx) => {
  const roomId = ctx.req.param("roomId");
  const textStream = container.get(TextStreamPort);

  return streamSSE(ctx, async (stream) => {
    const events = textStream.subscribe(roomId);

    for await (const event of events) {
      await stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event),
      });
    }
  });
});

// GET /api/v1/room/:roomId/events — Historical session events (persisted)
messageRouter.get("/:roomId/events", async (ctx) => {
  const roomId = ctx.req.param("roomId");
  const roomEventRepository = container.get(RoomEventRepositoryPort);
  const events = await roomEventRepository.findByRoomId(roomId);
  return ctx.json({ events });
});

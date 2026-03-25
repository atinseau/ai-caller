import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { ChatServicePort } from "@/domain/ports/chat-service.port.ts";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port.ts";
import { TextStreamPort } from "@/domain/ports/text-stream.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { container } from "@/infrastructure/di/container.ts";
import { SendMessageRequestDto } from "../dtos/room/send-message-request.dto.ts";
import { SendMessageResponseDto } from "../dtos/room/send-message-response.dto.ts";

export const messageRouter = new OpenAPIHono();

const RoomIdParam = z.object({
  roomId: z.string().openapi({ description: "Room ID" }),
});

// ─── POST /{roomId}/messages ────────────────────────────────────────────────

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

messageRouter.openapi(sendMessageRoute, async (ctx) => {
  const { roomId } = ctx.req.valid("param");
  const { text } = ctx.req.valid("json");

  const roomRepo = container.get(RoomRepositoryPort);
  const room = await roomRepo.findById(roomId);

  if (room?.modality === "TEXT") {
    const chatService = container.get(ChatServicePort);
    for await (const _event of chatService.sendMessage(roomId, text)) {
      /* Events are streamed via SSE separately — just exhaust the generator */
    }
    return ctx.json({ message: "Message sent" });
  }

  const gateway = container.get(RealtimeGatewayPort);
  gateway.sendTextToProvider(roomId, text);

  return ctx.json({ message: "Message sent" });
});

// ─── GET /{roomId}/stream ───────────────────────────────────────────────────

const streamRoute = createRoute({
  method: "get",
  path: "/{roomId}/stream",
  request: {
    params: RoomIdParam,
  },
  responses: {
    200: {
      description: "SSE stream of real-time session events",
    },
  },
});

messageRouter.openapi(streamRoute, (ctx) => {
  const { roomId } = ctx.req.valid("param");
  const textStream = container.get(TextStreamPort);

  return streamSSE(ctx, async (stream) => {
    const events = textStream.subscribe(roomId);

    const keepalive = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "keepalive", data: "" });
      } catch {
        clearInterval(keepalive);
      }
    }, 15_000);

    try {
      for await (const event of events) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });
      }
    } finally {
      clearInterval(keepalive);
    }
  });
});

// ─── GET /{roomId}/events ───────────────────────────────────────────────────

const eventsRoute = createRoute({
  method: "get",
  path: "/{roomId}/events",
  request: {
    params: RoomIdParam,
  },
  responses: {
    200: {
      description: "Historical session events (persisted)",
      content: {
        "application/json": {
          schema: z.object({
            events: z.array(z.record(z.string(), z.unknown())),
          }),
        },
      },
    },
  },
});

messageRouter.openapi(eventsRoute, async (ctx) => {
  const { roomId } = ctx.req.valid("param");
  const roomEventRepository = container.get(RoomEventRepositoryPort);
  const events = await roomEventRepository.findByRoomId(roomId);
  return ctx.json({ events });
});

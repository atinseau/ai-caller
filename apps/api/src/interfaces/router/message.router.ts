import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port";
import { TextStreamPort } from "@/domain/ports/text-stream.port";
import { container } from "@/infrastructure/di/container";
import { SendMessageRequestDto } from "../dtos/room/send-message-request.dto";
import { SendMessageResponseDto } from "../dtos/room/send-message-response.dto";

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

messageRouter.openapi(sendMessageRoute, async (ctx) => {
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

// GET /api/v1/room/:roomId/stream — SSE stream of text responses
messageRouter.get("/:roomId/stream", async (ctx) => {
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

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { RoomUseCase } from "@/application/use-cases/room.use-case";
import { container } from "@/infrastructure/di/container";
import { AttachCallToRoomRequestDto } from "../dtos/room/attach-call-to-room-request.dto";
import { AttachCallToRoomResponseDto } from "../dtos/room/attach-call-to-room-response.dto";
import { CreateRoomParamsRequestDto } from "../dtos/room/create-room-params-request.dto";
import { CreateRoomResponseDto } from "../dtos/room/create-room-response.dto";

export const roomRouter = new OpenAPIHono();

const createRoomRoute = createRoute({
  method: "post",
  path: "/create",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateRoomParamsRequestDto,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Room created successfully",
      content: {
        "application/json": {
          schema: CreateRoomResponseDto,
        },
      },
    },
  },
});

roomRouter.openapi(createRoomRoute, async (ctx) => {
  const roomUseCase = container.get(RoomUseCase);
  const room = await roomUseCase.createRoom(ctx.req.valid("json"));

  return ctx.json({
    message: "Room created successfully",
    data: room,
  });
});

const attachCallToRoomRoute = createRoute({
  method: "patch",
  path: "/:roomId/attach/:id",
  request: {
    params: AttachCallToRoomRequestDto,
  },
  responses: {
    200: {
      description: "Call attached to room successfully",
      content: {
        "application/json": {
          schema: AttachCallToRoomResponseDto,
        },
      },
    },
  },
});

roomRouter.openapi(attachCallToRoomRoute, async (ctx) => {
  const roomUseCase = container.get(RoomUseCase);
  await roomUseCase.attachCallToRoom(ctx.req.valid("param"));
  return ctx.json({
    message: "Call attached to room successfully",
  });
});

// export const openAiRouter = new Hono()

// let token: string | null = null;

// openAiRouter.get('/token/:companyId', validator('param', (value) => CreateSessionParams.parse(value)), async (ctx) => {
//   const companyRepository = container.get(CompanyRepositoryPort)

//   try {
//     const companyId = ctx.req.param('companyId');
//     const company = await companyRepository.findById(companyId);

//     if (!company) {
//       ctx.status(404)
//       return ctx.json({
//         error: "Company not found"
//       });
//     }

//     const openai = new OpenAI({
//       apiKey: Bun.env.OPENAI_API_KEY,
//     })

//     const data = await openai.realtime.clientSecrets({
//       session: {
//         output_modalities: ["audio"],
//         tool_choice: "auto",
//         type: "realtime",
//         model: "gpt-realtime",
//         tools: [
//           {
//             type: "mcp",
//             server_label: "default",
//             server_url: company.mcpServerUrl,
//             require_approval: 'never'
//           }
//         ],
//         instructions: `
//         You are an AI assistant that helps users by providing information,
//         taking actions using tools, and answering questions to the best of your ability.
//         Always use the provided tools when necessary to fulfill user requests.
//         `,
//         audio: {
//           output: {
//             speed: 1,
//             voice: "alloy",
//           },
//         },
//       }
//     })

//     return ctx.json(data);
//   } catch (error) {
//     console.error("Token generation error:", error);
//     ctx.status(500)
//     return ctx.json({ error: "Failed to generate token" });
//   }
// })

// openAiRouter.patch('/calls/:id', async (ctx) => {
//   const { id } = ctx.req.param();

//   console.log("Initiating WebSocket connection for call ID:", id);
//   console.log("Using token:", token);

//   const openai = new OpenAI({
//     apiKey: token || ''
//   })

//   const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${id}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     }
//   } as any);

//   ws.onopen = () => {
//     console.log("WebSocket connection established for call ID:", id);
//   }

//   ws.onerror = (event) => {
//     console.error("WebSocket error for call ID:", id, event);
//   }

//   ws.onmessage = async (event) => {
//     const data = JSON.parse(event.data);
//     console.log("Message type:", data.type);

//     if (data.type === "response.done") {
//       console.log("Received response data:", JSON.stringify(data.response.output, null, 2));
//     }

//     if (data.type === "output_audio_buffer.stopped") {
//       console.log("Audio streaming has stopped for call ID:", id);
//     }
//   }

//   ws.onclose = () => {
//     console.log("WebSocket connection closed for call ID:", id);
//   }

//   return ctx.json({ message: `WebSocket initiated for call ID: ${id}` });
// });

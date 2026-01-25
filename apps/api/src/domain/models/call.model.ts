import { z } from "@hono/zod-openapi";

export const CallStatusEnum = z.enum([
  "CREATED",
  "CONNECTED",
  "ENDED",
  "FAILED",
]);

export const CallProviderEnum = z.enum(["DEV", "TWILIO"]);

export const CallModel = z
  .object({
    id: z.uuidv7().openapi({
      description: "Unique identifier for the call",
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    }),
    companyId: z.uuidv7().openapi({
      description: "Identifier of the associated company",
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa7",
    }),
    roomId: z.uuidv7().nullable().optional().openapi({
      description: "Associated room identifier, if any",
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa8",
    }),
    externalCallId: z.string().nullable().optional().openapi({
      description: "External provider call identifier",
      example: "call_abc123",
    }),
    status: CallStatusEnum.openapi({
      description: "Current status of the call",
      example: "CREATED",
    }),
    provider: CallProviderEnum.openapi({
      description: "Call provider",
      example: "DEV",
    }),
    startedAt: z.date().nullable().optional().openapi({
      description: "Call start timestamp",
      example: "2024-01-01T12:00:00Z",
    }),
    endedAt: z.date().nullable().optional().openapi({
      description: "Call end timestamp",
      example: "2024-01-01T12:10:00Z",
    }),
    durationSeconds: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .optional()
      .openapi({
        description: "Duration of the call in seconds",
        example: 600,
      }),
    transcript: z
      .record(z.unknown())
      .nullable()
      .optional()
      .openapi({
        description: "Transcript data of the call",
        example: { messages: [{ role: "user", text: "Hello" }] },
      }),
    metadata: z
      .record(z.unknown())
      .nullable()
      .optional()
      .openapi({
        description: "Additional metadata about the call",
        example: { sentiment: "positive" },
      }),
    costCents: z.number().int().nonnegative().nullable().optional().openapi({
      description: "Estimated cost of the call in cents",
      example: 125,
    }),
    createdAt: z.date().openapi({
      description: "Creation timestamp of the call",
      example: "2024-01-01T12:00:00Z",
    }),
    updatedAt: z.date().openapi({
      description: "Last update timestamp of the call",
      example: "2024-01-01T12:05:00Z",
    }),
  })
  .openapi("CallModel", {
    description: "Represents a call entity",
  });

export type ICallModel = z.infer<typeof CallModel>;

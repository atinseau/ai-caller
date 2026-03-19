import type { JsonValue } from "@prisma/client/runtime/client";
import { randomUUIDv7 } from "bun";
import type { IToolInvokeModel } from "@/domain/models/tool.model.ts";
import type { ToolInvoke } from "@/generated/prisma/client";
import { ToolInvokeStatus } from "@/generated/prisma/enums";

export abstract class ToolInvokeMapper {
  static toModel(prismaToolInvoke: ToolInvoke): IToolInvokeModel {
    return {
      id: prismaToolInvoke.id,
      entityId: prismaToolInvoke.entityId,
      toolName: prismaToolInvoke.toolName ?? undefined,
      createdAt: prismaToolInvoke.createdAt,
      args: prismaToolInvoke.args as Record<string, unknown> | undefined,
      results: prismaToolInvoke.results as Record<string, unknown> | undefined,
      roomId: prismaToolInvoke.roomId,
      status: prismaToolInvoke.status,
    };
  }

  static toEntity(
    modelToolInvoke: Omit<IToolInvokeModel, "id" | "createdAt" | "status"> & {
      status?: ToolInvokeStatus;
    },
  ): ToolInvoke {
    return {
      id: randomUUIDv7(),
      entityId: modelToolInvoke.entityId,
      toolName: modelToolInvoke.toolName ?? null,
      updatedAt: new Date(),
      createdAt: new Date(),
      args: modelToolInvoke.args as JsonValue,
      results: modelToolInvoke.results as JsonValue,
      roomId: modelToolInvoke.roomId,
      status: modelToolInvoke.status || ToolInvokeStatus.RUNNING,
    };
  }
}

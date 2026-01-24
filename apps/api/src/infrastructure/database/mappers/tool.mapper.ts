import { randomUUIDv7 } from "bun";
import type { IToolInvokeModel } from "@/domain/models/tool.model";
import type { ToolInvoke } from "@/generated/prisma/client";
import { ToolInvokeStatus } from "@/generated/prisma/enums";

export abstract class ToolInvokeMapper {
  static toModel(prismaToolInvoke: ToolInvoke): IToolInvokeModel {
    return {
      id: prismaToolInvoke.id,
      entityId: prismaToolInvoke.entityId,
      createdAt: prismaToolInvoke.createdAt,
      args: prismaToolInvoke.args,
      results: prismaToolInvoke.results,
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
      createdAt: new Date(),
      args: modelToolInvoke.args,
      results: modelToolInvoke.results,
      roomId: modelToolInvoke.roomId,
      status: modelToolInvoke.status || ToolInvokeStatus.RUNNING,
    };
  }
}

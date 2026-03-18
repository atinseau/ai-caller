import { injectable } from "inversify";
import type { IToolInvokeModel } from "@/domain/models/tool.model";
import type { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { ToolInvokeStatus } from "@/generated/prisma/enums";
import { ToolInvokeMapper } from "../mappers/tool.mapper";
import { prisma } from "../prisma";

@injectable()
export class ToolRepositoryPrisma implements ToolRepositoryPort {
  async createToolInvoke(
    roomId: string,
    entityId: string,
    args?: Record<string, unknown>,
  ): Promise<IToolInvokeModel> {
    const entity = ToolInvokeMapper.toEntity({ roomId, entityId, args });
    const toolInvoke = await prisma.toolInvoke.create({
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JsonValue vs InputJsonValue mismatch
      data: entity as any,
    });
    return ToolInvokeMapper.toModel(toolInvoke);
  }

  async completeToolInvokeByEntityId(
    entityId: string,
    results: Record<string, unknown>,
  ): Promise<IToolInvokeModel> {
    const existing = await prisma.toolInvoke.findFirstOrThrow({
      where: { entityId, status: ToolInvokeStatus.RUNNING },
    });
    const toolInvoke = await prisma.toolInvoke.update({
      where: { id: existing.id },
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JsonValue vs InputJsonValue mismatch
      data: { status: ToolInvokeStatus.COMPLETED, results: results as any },
    });
    return ToolInvokeMapper.toModel(toolInvoke);
  }

  async failToolInvoke(toolInvokeId: string): Promise<IToolInvokeModel> {
    const toolInvoke = await prisma.toolInvoke.update({
      where: { id: toolInvokeId },
      data: { status: ToolInvokeStatus.FAILED },
    });
    return ToolInvokeMapper.toModel(toolInvoke);
  }
}

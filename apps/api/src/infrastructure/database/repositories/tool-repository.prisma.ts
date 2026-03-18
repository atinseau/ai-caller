import { inject, injectable } from "inversify";
import type { IToolInvokeModel } from "@/domain/models/tool.model";
import type { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import type { PrismaClient } from "@/generated/prisma/client";
import { ToolInvokeStatus } from "@/generated/prisma/enums";
import { ToolInvokeMapper } from "../mappers/tool.mapper";
import { PRISMA_TOKEN } from "../prisma";

@injectable()
export class ToolRepositoryPrisma implements ToolRepositoryPort {
  constructor(
    @inject(PRISMA_TOKEN) private readonly prisma: PrismaClient,
  ) {}

  async createToolInvoke(
    roomId: string,
    entityId: string,
    toolName?: string,
    args?: Record<string, unknown>,
  ): Promise<IToolInvokeModel> {
    const entity = ToolInvokeMapper.toEntity({
      roomId,
      entityId,
      toolName,
      args,
    });
    const toolInvoke = await this.prisma.toolInvoke.create({
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JsonValue vs InputJsonValue mismatch
      data: entity as any,
    });
    return ToolInvokeMapper.toModel(toolInvoke);
  }

  async completeToolInvokeByEntityId(
    entityId: string,
    results: Record<string, unknown>,
  ): Promise<IToolInvokeModel> {
    const existing = await this.prisma.toolInvoke.findFirstOrThrow({
      where: { entityId, status: ToolInvokeStatus.RUNNING },
    });
    const toolInvoke = await this.prisma.toolInvoke.update({
      where: { id: existing.id },
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JsonValue vs InputJsonValue mismatch
      data: { status: ToolInvokeStatus.COMPLETED, results: results as any },
    });
    return ToolInvokeMapper.toModel(toolInvoke);
  }

  async failToolInvoke(toolInvokeId: string): Promise<IToolInvokeModel> {
    const toolInvoke = await this.prisma.toolInvoke.update({
      where: { id: toolInvokeId },
      data: { status: ToolInvokeStatus.FAILED },
    });
    return ToolInvokeMapper.toModel(toolInvoke);
  }

  async findByEntityId(entityId: string): Promise<IToolInvokeModel | null> {
    const toolInvoke = await this.prisma.toolInvoke.findFirst({
      where: { entityId },
    });
    return toolInvoke ? ToolInvokeMapper.toModel(toolInvoke) : null;
  }

  async findActiveByRoomId(roomId: string): Promise<IToolInvokeModel[]> {
    const toolInvokes = await this.prisma.toolInvoke.findMany({
      where: { roomId, status: ToolInvokeStatus.RUNNING },
    });
    return toolInvokes.map(ToolInvokeMapper.toModel);
  }
}

import { injectable } from "inversify";
import type { IToolInvokeModel } from "@/domain/models/tool.model";
import type { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { ToolInvokeMapper } from "../mappers/tool.mapper";
import { prisma } from "../prisma";

@injectable()
export class ToolRepositoryPrisma implements ToolRepositoryPort {
  public async createToolInvoke(
    _roomId: string,
    _entityId: string,
    _args?: Record<string, unknown>,
  ): Promise<IToolInvokeModel> {
    // Create the database record
    const toolInvoke = await prisma.toolInvoke.create({
      data: {},
    });

    // Convert Prisma entity to domain model
    return ToolInvokeMapper.toModel(toolInvoke);
  }

  public completeToolInvokeByEntityId(
    _entityId: string,
    _results: Record<string, unknown>,
  ): Promise<IToolInvokeModel> {}

  public failToolInvoke(_toolInvokeId: string): Promise<IToolInvokeModel> {}
}

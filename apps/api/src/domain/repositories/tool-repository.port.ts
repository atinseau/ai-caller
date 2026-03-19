import type { IToolInvokeModel } from "../models/tool.model.ts";

export abstract class ToolRepositoryPort {
  abstract createToolInvoke(
    roomId: string,
    entityId: string,
    toolName?: string,
    args?: Record<string, unknown>,
  ): Promise<IToolInvokeModel>;

  abstract completeToolInvokeByEntityId(
    entityId: string,
    results: Record<string, unknown>,
  ): Promise<IToolInvokeModel>;

  abstract failToolInvoke(toolInvokeId: string): Promise<IToolInvokeModel>;

  abstract findByEntityId(entityId: string): Promise<IToolInvokeModel | null>;

  abstract findActiveByRoomId(roomId: string): Promise<IToolInvokeModel[]>;
}

import type { ToolInvokeMapper } from "@/infrastructure/database/mappers/tool.mapper";
import type { IToolInvokeModel } from "../models/tool.model";

/**
 * Repository port for managing tool invocations.
 *
 * Tool invocations represent the execution of tools within a room, storing
 * the arguments passed to the tool and the results returned from execution.
 *
 */
export abstract class ToolRepositoryPort {
  /**
   * Creates a new tool invocation record.
   *
   * @param roomId - Unique identifier for the room (UUIDv7)
   * @param entityId - Identifier for the entity associated with the tool invoke
   * @param args - Optional arguments passed to the tool
   * @returns Promise that resolves when the tool invoke is created
   */
  abstract createToolInvoke(
    roomId: string,
    entityId: string,
    args?: Record<string, never>,
  ): Promise<IToolInvokeModel>;

  abstract completeToolInvoke(
    toolInvokeId: string,
    results: Record<string, unknown>,
  ): Promise<IToolInvokeModel>;

  abstract failToolInvoke(toolInvokeId: string): Promise<IToolInvokeModel>;
}

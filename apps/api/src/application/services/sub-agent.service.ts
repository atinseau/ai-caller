import { inject, injectable } from "inversify";
import { LoggerPort } from "@/domain/ports/logger.port";
import { McpClientPort } from "@/domain/ports/mcp-client.port";
import { PromptPort } from "@/domain/ports/prompt.port";
import {
  SubAgentPort,
  type SubAgentConfig,
  type SubAgentResult,
} from "@/domain/ports/sub-agent.port";
import { TextStreamPort } from "@/domain/ports/text-stream.port";
import { ToolRepositoryPort } from "@/domain/repositories/tool-repository.port";
import { env } from "@/infrastructure/config/env";

@injectable()
export class SubAgentService implements SubAgentPort {
  constructor(
    @inject(McpClientPort) private readonly mcpClient: McpClientPort,
    @inject(ToolRepositoryPort) private readonly toolRepo: ToolRepositoryPort,
    @inject(TextStreamPort) private readonly textStream: TextStreamPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(PromptPort) private readonly prompt: PromptPort,
  ) {}

  async execute(config: SubAgentConfig): Promise<SubAgentResult> {
    this.textStream.publish(config.roomId, {
      type: "tool_status",
      toolInvokeId: config.toolInvokeId,
      status: "RUNNING",
      toolName: config.functionName,
    });

    try {
      await this.mcpClient.connect(config.mcpServerUrl);
      const rawResult = await this.mcpClient.callTool(
        config.functionName,
        config.functionArgs,
      );
      await this.mcpClient.disconnect();

      const summary = await this.processWithModel(
        config.model,
        config.functionName,
        rawResult,
      );

      await this.toolRepo.completeToolInvokeByEntityId(config.toolInvokeId, {
        raw: rawResult,
        summary,
      });

      this.textStream.publish(config.roomId, {
        type: "tool_status",
        toolInvokeId: config.toolInvokeId,
        status: "COMPLETED",
        toolName: config.functionName,
      });

      this.logger.info(
        `Sub-agent completed: ${config.functionName} (${config.toolInvokeId})`,
      );

      return { toolInvokeId: config.toolInvokeId, summary, rawResult };
    } catch (error) {
      const existing = await this.toolRepo
        .findByEntityId(config.toolInvokeId)
        .catch(() => null);
      if (existing) {
        await this.toolRepo.failToolInvoke(existing.id).catch(() => {});
      }

      this.textStream.publish(config.roomId, {
        type: "tool_status",
        toolInvokeId: config.toolInvokeId,
        status: "FAILED",
        toolName: config.functionName,
      });

      this.logger.error(
        error as object,
        `Sub-agent failed: ${config.functionName} (${config.toolInvokeId})`,
      );

      throw error;
    }
  }

  private async processWithModel(
    model: string,
    toolName: string,
    result: unknown,
  ): Promise<string> {
    const userPrompt = await this.prompt.render("sub-agent-summarize-prompt", {
      toolName,
      result: JSON.stringify(result, null, 2),
    });

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.get("OPENAI_API_KEY")}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 300,
        }),
      },
    );

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? JSON.stringify(result);
  }
}

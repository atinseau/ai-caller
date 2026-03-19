import { OpenAI } from "@ai-caller/shared";
import dayjs from "dayjs";
import { inject, injectable } from "inversify";
import type { ICompanyModel } from "@/domain/models/company.model";
import type { IRoomModel } from "@/domain/models/room.model";
import { LoggerPort } from "@/domain/ports/logger.port";
import { PromptPort } from "@/domain/ports/prompt.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import type { CallServicePort } from "@/domain/services/call-service.port";
import { env } from "@/infrastructure/config/env";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum";
import { McpToolDiscoveryService } from "./mcp-tool-discovery.service";

@injectable()
export class OpenAICallService implements CallServicePort {
  constructor(
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(PromptPort) private readonly prompt: PromptPort,
    @inject(McpToolDiscoveryService)
    private readonly toolDiscovery: McpToolDiscoveryService,
  ) {}

  async createCall(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT" = "AUDIO",
  ) {
    this.logger.info(company, `Creating OpenAI Realtime call`);

    const openai = new OpenAI({
      apiKey: env.get("OPENAI_API_KEY"),
    });

    const [instructions, callClose, getToolStatus] = await Promise.all([
      this.prompt.render("instructions-prompt", { env: "dev" }),
      this.prompt.render("call-close-tool-prompt"),
      this.prompt.render("get-tool-status-prompt"),
    ]);

    const tools = await this.buildTools(
      company,
      modality,
      callClose,
      getToolStatus,
    );

    this.logger.info(
      { instructions, tools, company },
      "Compiled OpenAI prompt templates",
    );

    const data = await openai.realtime.clientSecrets({
      expires_after: {
        anchor: "created_at",
        seconds: env.get("ROOM_CALL_DURATION_MINUTE") * 60,
      },
      session: {
        output_modalities: [modality === "TEXT" ? "text" : "audio"],
        instructions,
        audio: {
          output: {
            voice: "alloy",
            speed: 1,
          },
        },
        // biome-ignore lint/suspicious/noExplicitAny: tools are dynamically built from MCP discovery
        tools: tools as any,
        tool_choice: "auto",
        type: "realtime",
        model: "gpt-realtime-1.5",
        tracing: {
          workflow_name: "realtime-audio-call",
          metadata: {
            companyId: company.id as never,
          },
        },
      },
    });

    return {
      token: data.value,
      expiresAt: dayjs()
        .add(env.get("ROOM_CALL_DURATION_MINUTE"), "minute")
        .toDate(),
    };
  }

  async terminateCall(room: IRoomModel) {
    const openai = new OpenAI({ apiKey: room.token });
    if (!room.callId) {
      this.logger.error(`Room ${room.id} does not have a call ID.`);
      return;
    }
    await openai.realtime.hangups(room.callId);
    await this.roomRepository.deleteRoom(room.id);

    this.logger.info(`Call hung up for room ${room.id}`);
  }

  private async buildTools(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT",
    callCloseDescription: string,
    getToolStatusDescription: string,
  ) {
    const baseTools: unknown[] = [
      {
        type: "function",
        name: AiToolEnum.CALL_CLOSE,
        description: callCloseDescription,
      },
    ];

    if (modality === "TEXT") {
      // Text mode: discover MCP tools and register as functions
      const mcpFunctions = await this.toolDiscovery.discoverAsRealtimeFunctions(
        company.mcpUrl,
      );

      baseTools.push({
        type: "function",
        name: AiToolEnum.GET_TOOL_STATUS,
        description: getToolStatusDescription,
        parameters: {
          type: "object",
          properties: {
            tool_invoke_id: {
              type: "string",
              description: "The ID of the tool invocation to check",
            },
          },
          required: ["tool_invoke_id"],
        },
      });

      baseTools.push(...mcpFunctions);
    } else {
      // Audio mode: use native MCP (OpenAI connects directly)
      baseTools.push({
        type: "mcp" as "MCPTool",
        server_label: "mcp_server",
        require_approval: "never",
        server_url: company.mcpUrl,
      });
    }

    return baseTools;
  }
}

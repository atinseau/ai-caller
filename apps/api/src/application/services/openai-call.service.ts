import { OpenAI } from "@ai-caller/shared";
import dayjs from "dayjs";
import { inject, injectable } from "inversify";
import { VoiceEnum } from "@/domain/enums/voice.enum.ts";
import type {
  ICompanyModel,
  ISystemToolPrompts,
  IToolConfigs,
} from "@/domain/models/company.model.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { PromptPort } from "@/domain/ports/prompt.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import type { CallServicePort } from "@/domain/services/call-service.port.ts";
import { env } from "@/infrastructure/config/env.ts";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum.ts";
import { McpToolDiscoveryService } from "./mcp-tool-discovery.service.ts";

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

  async buildSessionConfig(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT" = "AUDIO",
  ): Promise<Record<string, unknown>> {
    const sections = company.systemPromptSections;
    const [instructions, callClose, getToolStatus] = await Promise.all([
      this.prompt.render("instructions-prompt", {
        companyName: company.name,
        roleObjective: sections?.roleObjective ?? "",
        personalityTone: sections?.personalityTone ?? "",
        context: sections?.context ?? "",
        referencePronunciations: sections?.referencePronunciations ?? "",
        instructionsRules: sections?.instructionsRules ?? "",
        conversationFlow: sections?.conversationFlow ?? "",
        safetyEscalation: sections?.safetyEscalation ?? "",
        language: company.language ?? "",
      }),
      this.prompt.render("call-close-tool-prompt"),
      this.prompt.render("get-tool-status-prompt"),
    ]);

    const tools = await this.buildTools(company, callClose, getToolStatus);

    this.logger.info(
      { instructions, tools, company },
      "Compiled OpenAI prompt templates",
    );

    const voice = (company.voice as VoiceEnum) ?? VoiceEnum.MARIN;

    return {
      output_modalities: [modality === "TEXT" ? "text" : "audio"],
      instructions,
      audio: {
        input: {
          transcription: {
            model: "gpt-4o-mini-transcribe",
            ...(company.language ? { language: company.language } : {}),
          },
        },
        output: {
          voice,
          speed: 1,
        },
      },
      tools,
      tool_choice: "auto",
      type: "realtime",
      model: "gpt-realtime-1.5",
      tracing: {
        workflow_name: "realtime-audio-call",
        metadata: {
          companyId: company.id,
        },
      },
    };
  }

  async createCall(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT" = "AUDIO",
  ) {
    this.logger.info(company, `Creating OpenAI Realtime call`);

    const openai = new OpenAI({
      apiKey: env.get("OPENAI_API_KEY"),
    });

    const sessionConfig = await this.buildSessionConfig(company, modality);

    const data = await openai.realtime.clientSecrets({
      expires_after: {
        anchor: "created_at",
        seconds: env.get("ROOM_CALL_DURATION_MINUTE") * 60,
      },
      // biome-ignore lint/suspicious/noExplicitAny: session config includes fields not yet fully typed in shared OpenAPI schema
      session: sessionConfig as any,
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
    callCloseDescription: string,
    getToolStatusDescription: string,
  ) {
    const systemToolPrompts = company.systemToolPrompts;

    const baseTools: unknown[] = [
      {
        type: "function",
        name: AiToolEnum.CALL_CLOSE,
        description: this.mergeSystemToolPrompt(
          callCloseDescription,
          AiToolEnum.CALL_CLOSE,
          systemToolPrompts,
        ),
      },
    ];

    if (company.mcpUrl) {
      const mcpFunctions = await this.toolDiscovery.discoverAsRealtimeFunctions(
        company.mcpUrl,
      );

      baseTools.push({
        type: "function",
        name: AiToolEnum.GET_TOOL_STATUS,
        description: this.mergeSystemToolPrompt(
          getToolStatusDescription,
          AiToolEnum.GET_TOOL_STATUS,
          systemToolPrompts,
        ),
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

      this.applyToolConfigs(mcpFunctions, company.toolConfigs);
      baseTools.push(...mcpFunctions);
    }

    return baseTools;
  }

  private mergeSystemToolPrompt(
    baseDescription: string,
    toolName: string,
    systemToolPrompts: ISystemToolPrompts | undefined | null,
  ): string {
    const custom = systemToolPrompts?.[toolName];
    if (!custom?.trim()) return baseDescription;
    return `${baseDescription}\n\n${custom}`;
  }

  private applyToolConfigs(
    tools: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }[],
    configs: IToolConfigs | undefined | null,
  ) {
    if (!configs) return;

    for (const tool of tools) {
      const cfg = configs[tool.name];
      if (!cfg) continue;

      if (cfg.description) {
        tool.description = cfg.description;
      }

      if (cfg.parameters) {
        const props = tool.parameters?.properties as
          | Record<string, { description?: string }>
          | undefined;
        if (props) {
          for (const [paramName, paramCfg] of Object.entries(cfg.parameters)) {
            if (props[paramName] && paramCfg.description) {
              props[paramName].description = paramCfg.description;
            }
          }
        }
      }
    }
  }
}

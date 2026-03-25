import { OpenAI } from "@ai-caller/shared";
import dayjs from "dayjs";
import { inject, injectable } from "inversify";
import type {
  ICompanyModel,
  ISystemToolPrompts,
  IToolConfigs,
} from "@/domain/models/company.model.ts";
import type { IRoomModel } from "@/domain/models/room.model.ts";
import type { AudioProviderConfig } from "@/domain/ports/audio-provider.port.ts";
import { CachePort } from "@/domain/ports/cache.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { PromptPort } from "@/domain/ports/prompt.port.ts";
import { VoicePreviewPort } from "@/domain/ports/voice-preview.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import type { CallServicePort } from "@/domain/services/call-service.port.ts";
import { env } from "@/infrastructure/config/env.ts";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum.ts";
import { ContactService } from "./contact.service.ts";
import { McpToolDiscoveryService } from "./mcp-tool-discovery.service.ts";

@injectable()
export class OpenAICallService implements CallServicePort {
  constructor(
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(RoomEventRepositoryPort)
    private readonly roomEventRepository: RoomEventRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(PromptPort) private readonly prompt: PromptPort,
    @inject(McpToolDiscoveryService)
    private readonly toolDiscovery: McpToolDiscoveryService,
    @inject(ContactService)
    private readonly contactService: ContactService,
    @inject(VoicePreviewPort)
    private readonly voicePreview: VoicePreviewPort,
    @inject(CachePort) private readonly cache: CachePort,
  ) {}

  async buildSessionConfig(
    company: ICompanyModel,
    modality: "AUDIO" | "TEXT" = "AUDIO",
    contactSummary?: string,
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
        contactSummary: contactSummary ?? "",
      }),
      this.prompt.render("call-close-tool-prompt"),
      this.prompt.render("get-tool-status-prompt"),
    ]);

    const tools = await this.buildTools(company, callClose, getToolStatus);

    this.logger.info(
      { instructions, tools, company },
      "Compiled OpenAI prompt templates",
    );

    const voice =
      company.voice ?? this.voicePreview.listVoices()[0]?.id ?? "alloy";

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
    contactSummary?: string,
  ) {
    this.logger.info(company, "Creating OpenAI Realtime call");

    const openai = new OpenAI({
      apiKey: env.get("OPENAI_API_KEY"),
    });

    const sessionConfig = await this.buildSessionConfig(
      company,
      modality,
      contactSummary,
    );

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

  async buildAudioProviderConfig(
    company: ICompanyModel,
    contactSummary?: string,
  ): Promise<AudioProviderConfig> {
    // Cache the base config (without contactSummary) per company
    if (!contactSummary) {
      const cacheKey = `audio-config:${company.id}`;
      const cached = await this.cache.get<AudioProviderConfig>(cacheKey);
      if (cached) return cached;
    }

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
        contactSummary: contactSummary ?? "",
      }),
      this.prompt.render("call-close-tool-prompt"),
      this.prompt.render("get-tool-status-prompt"),
    ]);

    const tools = await this.buildTools(company, callClose, getToolStatus);

    const voice =
      company.voice ?? this.voicePreview.listVoices()[0]?.id ?? "alloy";

    const config: AudioProviderConfig = {
      instructions,
      tools: tools.map((t) => ({
        type: "function" as const,
        name: (t as { name: string }).name,
        description: (t as { description: string }).description,
        // Realtime API requires parameters on every tool — default to empty object schema
        parameters: (t as { parameters?: Record<string, unknown> })
          .parameters ?? {
          type: "object",
          properties: {},
        },
      })),
      voice,
      language: company.language ?? undefined,
      mcpUrl: company.mcpUrl ?? undefined,
    };

    // Only cache when no contactSummary (base config)
    if (!contactSummary) {
      await this.cache.set(`audio-config:${company.id}`, config, 300); // 5 min TTL
    }

    return config;
  }

  async terminateCall(room: IRoomModel) {
    // Extract transcript events BEFORE deleting the room (cascade-deletes events)
    // Then compact in the background so room deletion is not blocked by LLM call
    let transcriptData:
      | { contactId: string; events: { type: string; payload: unknown }[] }
      | undefined;

    if (!room.isTest && room.contactId) {
      try {
        const events = await this.roomEventRepository.findByRoomId(room.id);
        transcriptData = { contactId: room.contactId, events };
      } catch (error) {
        this.logger.error(
          error as object,
          `Failed to extract transcript for room ${room.id}`,
        );
      }
    }

    if (room.callId) {
      const openai = new OpenAI({ apiKey: room.token });
      await openai.realtime.hangups(room.callId);
    }
    await this.roomRepository.deleteRoom(room.id);

    // Fire-and-forget: compact session with pre-fetched events
    if (transcriptData) {
      this.contactService
        .compactSessionFromEvents(
          transcriptData.contactId,
          transcriptData.events,
        )
        .catch((err) =>
          this.logger.error(
            err as object,
            `Failed to compact session for contact ${transcriptData?.contactId}`,
          ),
        );
    }

    this.logger.info(`Call terminated for room ${room.id}`);
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

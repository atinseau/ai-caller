import { OpenAI } from "@ai-caller/shared";
import dayjs from "dayjs";
import { compile } from "handlebars";
import { inject, injectable } from "inversify";
import type { ICompanyModel } from "@/domain/models/company.model";
import type { IRoomModel } from "@/domain/models/room.model";
import { CallRepositoryPort } from "@/domain/repositories/call-repository.port";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port";
import type { CallServicePort } from "@/domain/services/call-service.port";
import { env } from "@/infrastructure/config/env";
import { logger } from "@/infrastructure/logger";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum";

@injectable()
export class OpenAICallService implements CallServicePort {
  constructor(
    @inject(RoomRepositoryPort)
    private readonly roomRepository: RoomRepositoryPort,
    @inject(CallRepositoryPort)
    private readonly callRepository: CallRepositoryPort,
  ) {}

  async createCall(company: ICompanyModel) {
    logger.info(company, `Creating OpenAI Realtime call`);

    const openai = new OpenAI({
      apiKey: env.get("OPENAI_API_KEY"),
    });

    const prompts = await this.getPrompts(company);
    const data = await openai.realtime.clientSecrets({
      expires_after: {
        anchor: "created_at",
        seconds: env.get("ROOM_CALL_DURATION_MINUTE") * 60,
      },
      session: {
        output_modalities: ["audio"],
        instructions: prompts.instructions,
        audio: {
          output: {
            voice: "alloy",
            speed: 1,
          },
        },
        tools: [
          {
            type: "function",
            name: AiToolEnum.CALL_CLOSE,
            description: prompts.tools.callClose,
          },
          {
            type: "mcp",
            server_label: "mcp_server",
            require_approval: "never",
            server_url: company.mcpUrl,
          },
        ],
        tool_choice: "auto",
        type: "realtime",
        model: "gpt-realtime",
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
      logger.error(`Room ${room.id} does not have a call ID.`);
      return;
    }
    await openai.realtime.hangups(room.callId);

    const call = await this.callRepository.findByRoomId(room.id);
    if (call) {
      const durationSeconds = call.startedAt
        ? dayjs().diff(dayjs(call.startedAt), "second")
        : undefined;
      const estimatedCostCents = this.estimateDevCostCents(durationSeconds);

      await this.callRepository.updateCall(call.id, {
        status: "ENDED",
        endedAt: new Date(),
        durationSeconds,
        costCents: estimatedCostCents,
      });
    }

    await this.roomRepository.deleteRoom(room.id);

    logger.info(`Call hung up for room ${room.id}`);
  }

  private async getPrompts(company: ICompanyModel) {
    const instructionsPrompt = Bun.file(
      new URL("../../prompts/instructions-prompt.md", import.meta.url),
    );

    const callClosePrompt = Bun.file(
      new URL("../../prompts/call-close-tool-prompt.md", import.meta.url),
    );

    const [compiledPrompt, compiledCallCloseTool] = await Promise.all([
      this.compileTemplate(instructionsPrompt),
      this.compileTemplate(callClosePrompt),
    ]);

    const prompts = {
      instructions: compiledPrompt({
        env: "dev",
      }),
      tools: {
        callClose: compiledCallCloseTool({}),
      },
    };

    logger.info({ prompts, company }, `Compiled OpenAI prompt templates`);

    return prompts;
  }

  private estimateDevCostCents(durationSeconds?: number) {
    if (!durationSeconds || durationSeconds <= 0) {
      return undefined;
    }

    const minutes = Math.ceil(durationSeconds / 60);
    const pricePerMinuteCents = 5;
    return minutes * pricePerMinuteCents;
  }

  private async compileTemplate(promptFile: Bun.BunFile) {
    const text = await promptFile.text();
    return compile(text);
  }
}

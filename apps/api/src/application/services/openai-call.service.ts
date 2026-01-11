import { OpenAI } from "@ai-caller/shared";
import dayjs from "dayjs";
import { compile } from "handlebars";
import type { ICompanyModel } from "@/domain/models/company.model";
import type { CallServicePort } from "@/domain/services/call-service.port";
import { logger } from "@/infrastructure/logger";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum";

export class OpenAICallService implements CallServicePort {
  async createCall(company: ICompanyModel) {
    logger.info(company, `Creating OpenAI Realtime call`);

    const openai = new OpenAI({
      apiKey: Bun.env.OPENAI_API_KEY,
    });

    const maxRoomCallDurationMinute = parseInt(
      Bun.env.MAX_ROOM_CALL_DURATION_MINUTE,
      10,
    );

    const prompts = await this.getPrompts(company);
    const data = await openai.realtime.clientSecrets({
      expires_after: {
        anchor: "created_at",
        seconds: maxRoomCallDurationMinute * 60,
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
      expiresAt: dayjs().add(maxRoomCallDurationMinute, "minute").toDate(),
    };
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

  private async compileTemplate(promptFile: Bun.BunFile) {
    const text = await promptFile.text();
    return compile(text);
  }
}

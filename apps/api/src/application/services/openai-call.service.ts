import { OpenAI } from "@ai-caller/shared";
import dayjs from "dayjs";
import type { ICompanyModel } from "@/domain/models/company.model";
import type { CallServicePort } from "@/domain/services/call-service.port";

export class OpenAICallService implements CallServicePort {
  async createCall(company: ICompanyModel) {
    const openai = new OpenAI({
      apiKey: Bun.env.OPENAI_API_KEY,
    });

    // const FAKE_COMPANY_NAME = "Acme Corp";

    const maxRoomCallDurationMinute = parseInt(
      Bun.env.MAX_ROOM_CALL_DURATION_MINUTE,
      10,
    );
    const data = await openai.realtime.clientSecrets({
      expires_after: {
        anchor: "created_at",
        seconds: maxRoomCallDurationMinute * 60,
      },
      session: {
        output_modalities: ["audio"],
        // prompt: {
        // id:
        // },
        tool_choice: "auto",
        type: "realtime",
        model: "gpt-realtime",
        tools: [
          {
            type: "mcp",
            server_label: "default",
            server_url: company.mcpTestUrl,
            require_approval: "never",
          },
        ],
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
}

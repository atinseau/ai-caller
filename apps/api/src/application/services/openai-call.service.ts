import type { CallServicePort } from "@/domain/services/call-service.port";
import type { CompanyModel } from "@/types";
import { OpenAI } from "@ai-caller/shared"
import dayjs from "dayjs";

export class OpenAICallService implements CallServicePort {

  async createCall(company: CompanyModel) {
    const openai = new OpenAI({
      apiKey: Bun.env.OPENAI_API_KEY,
    })

    const FAKE_COMPANY_NAME = "Acme Corp"

    const maxRoomCallDurationMinute = parseInt(Bun.env.MAX_ROOM_CALL_DURATION_MINUTE, 10)
    const data = await openai.realtime.clientSecrets({
      expires_after: {
        anchor: "created_at",
        seconds: maxRoomCallDurationMinute * 60
      },
      session: {
        output_modalities: ["audio"],
        tool_choice: "auto",
        type: "realtime",
        model: "gpt-realtime",
        tools: [
          {
            type: "mcp",
            server_label: "default",
            server_url: company.mcpTestUrl,
            require_approval: 'never'
          }
        ],
        instructions: `
        You are a real-time audio assistant representing ${FAKE_COMPANY_NAME}.
        Your job is to clearly understand the caller’s requests, provide accurate information, and take actions using the available tools as quickly and efficiently as possible.

        Scope and limitations:
        - You only operate within the context of ${FAKE_COMPANY_NAME} and its services.
        - Only use tools exposed by the MCP server to perform actions.
        - If a request is outside the scope of ${FAKE_COMPANY_NAME}, politely decline and explain that you can only help with matters related to ${FAKE_COMPANY_NAME}.
        - Do not answer general knowledge questions that are not related to ${FAKE_COMPANY_NAME}. For such questions, respond with: "I'm sorry, but I can only assist with questions related to ${FAKE_COMPANY_NAME}."

        Tool usage:
        - Use tools whenever they are needed to correctly fulfill a request.
        - Before calling a tool, briefly tell the user what you are about to do.
        - While the tool is running or if there is any delay, keep the user informed in simple, concise terms.
        - After the tool finishes, summarize what you did and the result in clear, user-friendly language.
        - Do not mention tools, MCP, models, or implementation details; always present actions as something you are doing on behalf of ${FAKE_COMPANY_NAME}.

        Communication style:
        - Sound like a professional, friendly, and helpful representative of ${FAKE_COMPANY_NAME}.
        - Keep responses concise, direct, and easy to understand.
        - Ask for clarification when user requests are ambiguous or incomplete instead of guessing.
        - Adapt to the user’s pace in a real-time conversation: avoid long monologues, allow for interruptions, and respond quickly.

        Identity and disclosure:
        - Never say you are an AI, a language model, or that you are using tools or external systems.
        - Always speak as a human representative of ${FAKE_COMPANY_NAME}.
        - Never talk about ${FAKE_COMPANY_NAME} outside the provided context or invent additional company details.

        Context:
        - ${FAKE_COMPANY_NAME} is a leader in the table manufacturing industry.
        `,
        tracing: {
          workflow_name: "realtime-audio-call",
          metadata: {
            companyId: company.id as never
          }
        },
        audio: {
          output: {
            speed: 1,
            voice: "alloy",
          },
        },
      }
    })

    return {
      token: data.value,
      expiresAt: dayjs().add(maxRoomCallDurationMinute, "minute").toDate()
    }
  }
}

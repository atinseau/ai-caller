import { inject, injectable } from "inversify";
import type {
  ChatServicePort,
  ChatStreamEvent,
  ChatTool,
} from "@/domain/ports/chat-service.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { TextStreamPort } from "@/domain/ports/text-stream.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { env } from "@/infrastructure/config/env.ts";
import { AiToolEnum } from "@/interfaces/enums/ai-tool.enum.ts";
import { ToolExecutionService } from "./tool-execution.service.ts";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};

type SessionData = {
  messages: ChatMessage[];
  tools: ChatTool[];
  mcpUrl?: string;
  isTest?: boolean;
  closeRequested: boolean;
};

type StreamDelta = {
  content?: string | null;
  tool_calls?: {
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }[];
};

type StreamChunk = {
  choices?: { delta?: StreamDelta; finish_reason?: string | null }[];
};

@injectable()
export class OpenAIChatService implements ChatServicePort {
  private readonly sessions: Map<string, SessionData> = new Map();

  constructor(
    @inject(ToolExecutionService)
    private readonly toolExecution: ToolExecutionService,
    @inject(TextStreamPort) private readonly textStream: TextStreamPort,
    @inject(RoomEventRepositoryPort)
    private readonly roomEventRepository: RoomEventRepositoryPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
  ) {}

  initSession(
    roomId: string,
    instructions: string,
    tools: ChatTool[],
    mcpUrl?: string,
    isTest?: boolean,
  ): void {
    this.sessions.set(roomId, {
      messages: [{ role: "system", content: instructions }],
      tools,
      mcpUrl,
      isTest,
      closeRequested: false,
    });
  }

  async *sendMessage(
    roomId: string,
    userText: string,
  ): AsyncIterable<ChatStreamEvent> {
    const session = this.sessions.get(roomId);
    if (!session) {
      yield { type: "error", message: "Session not found" };
      return;
    }

    session.messages.push({ role: "user", content: userText });
    await this.roomEventRepository.create(roomId, "USER_TRANSCRIPT", {
      text: userText,
    });
    this.textStream.publish(roomId, {
      type: "user_transcript",
      text: userText,
    });

    yield* this.runCompletion(roomId, session);
  }

  destroySession(roomId: string): void {
    this.sessions.delete(roomId);
    this.textStream.close(roomId);
  }

  private async *runCompletion(
    roomId: string,
    session: SessionData,
  ): AsyncIterable<ChatStreamEvent> {
    const chatTools = session.tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: env.get("TEXT_MODEL"),
        messages: session.messages,
        tools: chatTools.length > 0 ? chatTools : undefined,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      this.logger.error(
        { status: response.status, body: errorText },
        `Chat Completions API error for room ${roomId}`,
      );
      yield { type: "error", message: `API error: ${response.status}` };
      return;
    }

    let fullText = "";
    const toolCalls: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          let chunk: StreamChunk;
          try {
            chunk = JSON.parse(data) as StreamChunk;
          } catch {
            continue;
          }

          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            fullText += delta.content;
            this.textStream.publish(roomId, {
              type: "text_delta",
              text: delta.content,
            });
            yield { type: "text_delta", text: delta.content };
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = toolCalls.get(tc.index);
              if (existing) {
                existing.arguments += tc.function?.arguments ?? "";
              } else {
                toolCalls.set(tc.index, {
                  id: tc.id ?? "",
                  name: tc.function?.name ?? "",
                  arguments: tc.function?.arguments ?? "",
                });
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (fullText) {
      this.textStream.publish(roomId, { type: "text_done", text: fullText });
      await this.roomEventRepository.create(roomId, "TEXT_DONE", {
        text: fullText,
      });
      session.messages.push({ role: "assistant", content: fullText });
      yield { type: "text_done", text: fullText };
    }

    if (toolCalls.size > 0) {
      const assistantToolCalls = [...toolCalls.values()].map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      }));

      session.messages.push({
        role: "assistant",
        content: null,
        tool_calls: assistantToolCalls,
      });

      yield* this.handleToolCalls(roomId, session, assistantToolCalls);
    }
  }

  private async *handleToolCalls(
    roomId: string,
    session: SessionData,
    toolCalls: {
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }[],
  ): AsyncIterable<ChatStreamEvent> {
    for (const tc of toolCalls) {
      const args = tc.function.arguments
        ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
        : {};

      if (tc.function.name === AiToolEnum.CALL_CLOSE) {
        session.closeRequested = true;
        session.messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ status: "acknowledged" }),
        });
        continue;
      }

      if (tc.function.name === AiToolEnum.GET_TOOL_STATUS) {
        const status = await this.toolExecution.getToolStatus(
          (args as { tool_invoke_id?: string }).tool_invoke_id ?? "",
        );
        session.messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(status),
        });
        continue;
      }

      // MCP tool — dispatch via shared ToolExecutionService
      const resultPromise = new Promise<string>((resolve, reject) => {
        this.toolExecution
          .dispatch({
            roomId,
            callId: tc.id,
            toolName: tc.function.name,
            args,
            mcpUrl: session.mcpUrl,
            isTest: session.isTest,
            onResult: (_toolName, summary) => resolve(summary),
            onError: (_toolName, error) => reject(new Error(error)),
          })
          .catch(reject);
      });

      yield {
        type: "tool_call",
        toolName: tc.function.name,
        callId: tc.id,
        args,
      };

      try {
        const summary = await resultPromise;
        session.messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: `[Tool result for ${tc.function.name}]: ${summary}`,
        });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Tool execution failed";
        session.messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: `[Tool error for ${tc.function.name}]: ${errorMsg}`,
        });
        this.logger.error(
          err as object,
          `Tool ${tc.function.name} failed in room ${roomId}`,
        );
      }
    }

    // After all tool results are collected, re-run the model
    yield* this.runCompletion(roomId, session);
  }
}

import { describe, expect, it } from "bun:test";
import { OpenAIAudioProviderAdapter } from "@/infrastructure/audio-providers/openai-audio-provider.adapter.ts";

describe("OpenAIAudioProviderAdapter — normalizeEvent", () => {
  const normalize = OpenAIAudioProviderAdapter.normalizeEvent;

  describe("transcript events", () => {
    it("should normalize agent transcript delta", () => {
      const result = normalize({
        type: "response.audio_transcript.delta",
        delta: "Hel",
      });

      expect(result).toEqual({
        type: "transcript.delta",
        text: "Hel",
        role: "agent",
      });
    });

    it("should normalize agent transcript done", () => {
      const result = normalize({
        type: "response.audio_transcript.done",
        transcript: "Hello, how can I help you?",
      });

      expect(result).toEqual({
        type: "transcript.done",
        text: "Hello, how can I help you?",
        role: "agent",
      });
    });

    it("should normalize user transcript", () => {
      const result = normalize({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "I need help",
      });

      expect(result).toEqual({
        type: "transcript.done",
        text: "I need help",
        role: "user",
      });
    });

    it("should handle missing fields gracefully", () => {
      const result = normalize({
        type: "response.audio_transcript.delta",
      });

      expect(result).toEqual({
        type: "transcript.delta",
        text: "",
        role: "agent",
      });
    });
  });

  describe("audio events", () => {
    it("should normalize audio delta", () => {
      const result = normalize({
        type: "response.audio.delta",
        delta: "base64data==",
      });

      expect(result).toEqual({
        type: "audio.delta",
        base64: "base64data==",
      });
    });

    it("should normalize audio done", () => {
      const result = normalize({ type: "response.audio.done" });
      expect(result).toEqual({ type: "audio.done" });
    });
  });

  describe("function call events", () => {
    it("should normalize completed function call from output_item.done", () => {
      const result = normalize({
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-456",
          name: "get_weather",
          status: "completed",
          arguments: '{"city":"Paris"}',
        },
      });

      expect(result).toEqual({
        type: "function_call",
        callId: "fc-456",
        name: "get_weather",
        arguments: '{"city":"Paris"}',
      });
    });

    it("should return null for non-completed function calls", () => {
      const result = normalize({
        type: "response.output_item.done",
        item: {
          type: "function_call",
          id: "fc-789",
          name: "search",
          status: "in_progress",
          arguments: "{}",
        },
      });

      expect(result).toBeNull();
    });

    it("should return null for message items (not function calls)", () => {
      const result = normalize({
        type: "response.output_item.done",
        item: {
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Hello" }],
        },
      });

      expect(result).toBeNull();
    });
  });

  describe("VAD events", () => {
    it("should normalize speech started", () => {
      const result = normalize({
        type: "input_audio_buffer.speech_started",
      });
      expect(result).toEqual({ type: "speech_started" });
    });

    it("should normalize speech stopped", () => {
      const result = normalize({
        type: "input_audio_buffer.speech_stopped",
      });
      expect(result).toEqual({ type: "speech_stopped" });
    });
  });

  describe("response lifecycle", () => {
    it("should normalize output_audio_buffer.stopped as response.done", () => {
      const result = normalize({ type: "output_audio_buffer.stopped" });
      expect(result).toEqual({ type: "response.done" });
    });
  });

  describe("unknown events", () => {
    it("should return null for session.created", () => {
      expect(normalize({ type: "session.created" })).toBeNull();
    });

    it("should return null for response.done (not mapped)", () => {
      expect(normalize({ type: "response.done" })).toBeNull();
    });

    it("should return null for unknown types", () => {
      expect(normalize({ type: "custom.event" })).toBeNull();
    });
  });
});

import { describe, expect, it } from "bun:test";
import { GrokAudioProviderAdapter } from "@/infrastructure/audio-providers/grok-audio-provider.adapter.ts";

describe("GrokAudioProviderAdapter — normalizeEvent", () => {
  const normalize = GrokAudioProviderAdapter.normalizeEvent;

  describe("transcript events", () => {
    it("should normalize agent transcript delta", () => {
      const result = normalize({
        type: "response.output_audio_transcript.delta",
        delta: "Bon",
      });

      expect(result).toEqual({
        type: "transcript.delta",
        text: "Bon",
        role: "agent",
      });
    });

    it("should normalize agent transcript done", () => {
      const result = normalize({
        type: "response.output_audio_transcript.done",
        transcript: "Bonjour, comment puis-je vous aider ?",
      });

      expect(result).toEqual({
        type: "transcript.done",
        text: "Bonjour, comment puis-je vous aider ?",
        role: "agent",
      });
    });

    it("should normalize user transcript", () => {
      const result = normalize({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "Oui bonjour",
      });

      expect(result).toEqual({
        type: "transcript.done",
        text: "Oui bonjour",
        role: "user",
      });
    });

    it("should handle missing transcript field", () => {
      const result = normalize({
        type: "response.output_audio_transcript.done",
      });

      expect(result).toEqual({
        type: "transcript.done",
        text: "",
        role: "agent",
      });
    });
  });

  describe("audio events", () => {
    it("should normalize audio delta", () => {
      const result = normalize({
        type: "response.output_audio.delta",
        delta: "base64audiochunk==",
      });

      expect(result).toEqual({
        type: "audio.delta",
        base64: "base64audiochunk==",
      });
    });

    it("should normalize audio done", () => {
      const result = normalize({ type: "response.output_audio.done" });
      expect(result).toEqual({ type: "audio.done" });
    });
  });

  describe("function call events", () => {
    it("should normalize function call arguments done", () => {
      const result = normalize({
        type: "response.function_call_arguments.done",
        call_id: "fc-123",
        name: "search_customer",
        arguments: '{"name":"John"}',
      });

      expect(result).toEqual({
        type: "function_call",
        callId: "fc-123",
        name: "search_customer",
        arguments: '{"name":"John"}',
      });
    });

    it("should handle missing function call fields", () => {
      const result = normalize({
        type: "response.function_call_arguments.done",
      });

      expect(result).toEqual({
        type: "function_call",
        callId: "",
        name: "",
        arguments: "{}",
      });
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
    it("should normalize response done", () => {
      const result = normalize({ type: "response.done" });
      expect(result).toEqual({ type: "response.done" });
    });
  });

  describe("unknown events", () => {
    it("should return null for session.created", () => {
      expect(normalize({ type: "session.created" })).toBeNull();
    });

    it("should return null for session.updated", () => {
      expect(normalize({ type: "session.updated" })).toBeNull();
    });

    it("should return null for unknown event types", () => {
      expect(normalize({ type: "some.unknown.event" })).toBeNull();
    });
  });
});

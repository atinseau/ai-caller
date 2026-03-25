export type VoiceInfo = {
  id: string;
  label: string;
  tone: string;
};

export type PreviewResult = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
};

export abstract class VoicePreviewPort {
  /** List voices available for this provider */
  abstract listVoices(): VoiceInfo[];

  /** Generate a TTS audio preview. Returns a stream + content type. */
  abstract generatePreview(
    voice: string,
    language: string,
    text: string,
    instructions: string,
  ): Promise<PreviewResult>;
}

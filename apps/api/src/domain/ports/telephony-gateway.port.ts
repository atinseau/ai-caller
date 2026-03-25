import type { AudioProviderConfig } from "./audio-provider.port.ts";

export abstract class TelephonyGatewayPort {
  /**
   * Initialize a telephony call: connects to an audio provider and bridges audio.
   * @param roomId The room ID for this call
   * @param config The normalized audio provider config (instructions, tools, voice, etc.)
   * @param sendToTwilio Callback to send messages back to the Twilio Media Streams WebSocket
   */
  abstract initCall(
    roomId: string,
    config: AudioProviderConfig,
    sendToTwilio: (message: Record<string, unknown>) => void,
  ): void | Promise<void>;

  /**
   * Forward base64-encoded audio from Twilio to the audio provider
   */
  abstract forwardAudio(roomId: string, base64Audio: string): void;

  /**
   * Handle a Twilio mark event for playback cursor tracking
   */
  abstract handleMark(roomId: string, markName: string): void;

  /**
   * Close the call: cleanup connection and destroy session
   */
  abstract closeCall(roomId: string): void;
}

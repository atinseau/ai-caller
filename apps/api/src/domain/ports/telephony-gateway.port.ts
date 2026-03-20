import type { ICompanyModel } from "../models/company.model.ts";

export abstract class TelephonyGatewayPort {
  /**
   * Initialize a telephony call: opens an OpenAI Realtime WebSocket and bridges audio.
   * @param roomId The room ID for this call
   * @param company The company configuration
   * @param sessionConfig The OpenAI session config (instructions, tools, voice, etc.)
   * @param sendToTwilio Callback to send messages back to the Twilio Media Streams WebSocket
   * @param mcpUrl Optional MCP server URL for tool execution
   * @param isTest Whether this is a test session
   */
  abstract initCall(
    roomId: string,
    company: ICompanyModel,
    sessionConfig: Record<string, unknown>,
    sendToTwilio: (message: Record<string, unknown>) => void,
    mcpUrl?: string,
    isTest?: boolean,
  ): void | Promise<void>;

  /**
   * Forward base64-encoded G.711 u-law audio from Twilio to OpenAI
   */
  abstract forwardAudioToOpenAI(roomId: string, base64Audio: string): void;

  /**
   * Handle a Twilio mark event for playback cursor tracking
   */
  abstract handleMark(roomId: string, markName: string): void;

  /**
   * Close the call: cleanup both WebSockets and destroy session
   */
  abstract closeCall(roomId: string): void;
}

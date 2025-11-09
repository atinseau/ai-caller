import type { JsonRouteBody, JsonRouteResponse } from "../../types/openai.types";
import type { BaseOpenAI } from "./base-openai";

export class OpenAIRealtime {
  constructor(
    private readonly client: BaseOpenAI
  ) { }

  public async calls(offer: RTCSessionDescriptionInit): Promise<{ answer: RTCSessionDescriptionInit, location: string | null }> {
    if (!this.client.config.model) {
      throw new Error("Model is not specified in the OpenAI client configuration");
    }

    const sdpResponse = await this.client.fetch(`/realtime/calls?model=${this.client.config.model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${this.client.config.apiKey}`,
        "Content-Type": "application/sdp",
      },
    });

    const location = sdpResponse.headers.get("Location");
    if (!location) {
      throw new Error("Location header is missing in the response from OpenAI Realtime API");
    }
    const sdp = await sdpResponse.text();
    console.log("Received SDP answer from OpenAI Realtime API:", sdp);
    return {
      answer: { type: "answer", sdp },
      location
    };
  }

  public async clientSecrets(sessionConfig: JsonRouteBody<"/realtime/client_secrets", "post">): Promise<JsonRouteResponse<"/realtime/client_secrets", "post", 200>> {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.client.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionConfig)
      },
    );
    return response.json()
  }

}

import type {
  JsonRouteBody,
  JsonRouteResponse,
  OpenAIConfig,
} from "../../types/openai.types";
import { openAiClient } from "./openai-client";

export class OpenAIRealtime {
  constructor(private readonly config: OpenAIConfig) {}

  public async calls(
    offer: RTCSessionDescriptionInit,
  ): Promise<{ answer: RTCSessionDescriptionInit; location: string | null }> {
    if (!this.config.model) {
      throw new Error(
        "Model is not specified in the OpenAI client configuration",
      );
    }

    if (offer.type !== "offer" || !offer.sdp) {
      throw new Error("Invalid RTCSessionDescriptionInit: missing offer SDP");
    }

    const sdpResponse = await openAiClient.POST(`/realtime/calls`, {
      body: offer.sdp,
      bodySerializer: (body) => (typeof body === "object" ? body.sdp : body),
      parseAs: "text",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpResponse.response.ok || !sdpResponse.data) {
      throw new Error(`Failed to create OpenAI Realtime call`);
    }

    const location = sdpResponse.response.headers.get("Location");
    if (!location) {
      throw new Error(
        "Location header is missing in the response from OpenAI Realtime API",
      );
    }
    console.log(
      "Received SDP answer from OpenAI Realtime API:",
      sdpResponse.data,
    );
    return {
      answer: {
        type: "answer",
        sdp: sdpResponse.data,
      },
      location,
    };
  }

  public async clientSecrets(
    sessionConfig: JsonRouteBody<"/realtime/client_secrets", "post">,
  ): Promise<JsonRouteResponse<"/realtime/client_secrets", "post", 200>> {
    const response = await openAiClient.POST("/realtime/client_secrets", {
      body: sessionConfig,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.data) {
      throw new Error(
        "Failed to obtain client secrets from OpenAI Realtime API",
      );
    }

    return response.data;
  }

  public async hangups(callId: string) {
    const response = await openAiClient.POST(
      `/realtime/calls/{call_id}/hangup`,
      {
        params: {
          path: {
            call_id: callId,
          },
        },
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      },
    );
    return response.response.ok;
  }
}

import { inject, injectable } from "inversify";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import type { WhatsAppClientPort } from "@/domain/ports/whatsapp-client.port.ts";
import { env } from "@/infrastructure/config/env.ts";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

@injectable()
export class MetaWhatsAppClientAdapter implements WhatsAppClientPort {
  constructor(@inject(LoggerPort) private readonly logger: LoggerPort) {}

  async sendMessage(
    phoneNumberId: string,
    to: string,
    text: string,
  ): Promise<void> {
    const accessToken = env.get("WHATSAPP_ACCESS_TOKEN");
    const url = `${META_GRAPH_API}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        { status: response.status, body: errorBody },
        `Failed to send WhatsApp message to ${to}`,
      );
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    this.logger.info(`WhatsApp message sent to ${to} via ${phoneNumberId}`);
  }

  async markRead(phoneNumberId: string, messageId: string): Promise<void> {
    const accessToken = env.get("WHATSAPP_ACCESS_TOKEN");
    const url = `${META_GRAPH_API}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });

    if (!response.ok) {
      this.logger.warn(`Failed to mark WhatsApp message ${messageId} as read`);
    }
  }
}

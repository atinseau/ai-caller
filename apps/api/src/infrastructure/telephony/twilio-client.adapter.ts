import { injectable } from "inversify";
import type { TwilioClientPort } from "@/domain/ports/twilio-client.port.ts";
import { env } from "@/infrastructure/config/env.ts";

@injectable()
export class TwilioClientAdapter implements TwilioClientPort {
  private getClient() {
    const accountSid = env.get("TWILIO_ACCOUNT_SID");
    const authToken = env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) {
      throw new Error(
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
      );
    }
    // Dynamic import to avoid loading the Twilio SDK when not configured
    // biome-ignore lint/suspicious/noExplicitAny: Twilio SDK types are loaded dynamically
    const twilio = require("twilio") as any;
    return twilio(accountSid, authToken);
  }

  async purchasePhoneNumber(
    country: string,
    areaCode?: string,
  ): Promise<{ phoneNumber: string; sid: string }> {
    const client = this.getClient();

    const searchParams: Record<string, unknown> = { limit: 1 };
    if (areaCode) searchParams.areaCode = areaCode;

    const available = await client
      .availablePhoneNumbers(country)
      .local.list(searchParams);
    if (available.length === 0) {
      throw new Error("No phone numbers available for the given criteria.");
    }

    // Some countries require an address and/or a regulatory bundle
    const [addresses, bundles] = await Promise.all([
      client.addresses.list({ limit: 1 }),
      client.numbers.v2.regulatoryCompliance.bundles.list({
        isoCountry: country,
        status: "twilio-approved",
        limit: 1,
      }),
    ]);

    // biome-ignore lint/suspicious/noExplicitAny: Twilio SDK types are loaded dynamically
    const createParams: any = {
      phoneNumber: available[0].phoneNumber,
    };
    if (addresses.length > 0) {
      createParams.addressSid = addresses[0].sid;
    }
    if (bundles.length > 0) {
      createParams.bundleSid = bundles[0].sid;
    }

    const purchased = await client.incomingPhoneNumbers.create(createParams);

    return { phoneNumber: purchased.phoneNumber, sid: purchased.sid };
  }

  async releasePhoneNumber(sid: string): Promise<void> {
    const client = this.getClient();
    await client.incomingPhoneNumbers(sid).remove();
  }

  async configureWebhook(sid: string, webhookUrl: string): Promise<void> {
    const client = this.getClient();
    await client.incomingPhoneNumbers(sid).update({
      voiceUrl: webhookUrl,
      voiceMethod: "POST",
    });
  }
}

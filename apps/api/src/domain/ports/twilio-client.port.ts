export abstract class TwilioClientPort {
  abstract purchasePhoneNumber(
    country: string,
    areaCode?: string,
  ): Promise<{ phoneNumber: string; sid: string }>;

  abstract releasePhoneNumber(sid: string): Promise<void>;

  abstract configureWebhook(sid: string, webhookUrl: string): Promise<void>;
}

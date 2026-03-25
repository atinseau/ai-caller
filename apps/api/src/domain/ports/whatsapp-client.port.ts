export abstract class WhatsAppClientPort {
  /**
   * Send a text message to a WhatsApp user.
   */
  abstract sendMessage(
    phoneNumberId: string,
    to: string,
    text: string,
  ): Promise<void>;

  /**
   * Mark a message as read.
   */
  abstract markRead(phoneNumberId: string, messageId: string): Promise<void>;
}

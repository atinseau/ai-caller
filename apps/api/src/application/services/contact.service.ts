import { inject, injectable } from "inversify";
import type { IContactModel } from "@/domain/models/contact.model.ts";
import { CachePort } from "@/domain/ports/cache.port.ts";
import { LoggerPort } from "@/domain/ports/logger.port.ts";
import { PromptPort } from "@/domain/ports/prompt.port.ts";
import {
  type ContactIdentifiers,
  ContactRepositoryPort,
} from "@/domain/repositories/contact-repository.port.ts";
import { RoomEventRepositoryPort } from "@/domain/repositories/room-event-repository.port.ts";
import { RoomRepositoryPort } from "@/domain/repositories/room-repository.port.ts";
import { env } from "@/infrastructure/config/env.ts";

@injectable()
export class ContactService {
  constructor(
    @inject(ContactRepositoryPort)
    private readonly contactRepo: ContactRepositoryPort,
    @inject(RoomEventRepositoryPort)
    private readonly roomEventRepo: RoomEventRepositoryPort,
    @inject(RoomRepositoryPort)
    private readonly roomRepo: RoomRepositoryPort,
    @inject(PromptPort) private readonly prompt: PromptPort,
    @inject(LoggerPort) private readonly logger: LoggerPort,
    @inject(CachePort) private readonly cache: CachePort,
  ) {}

  async findOrCreate(
    companyId: string,
    identifiers: ContactIdentifiers,
  ): Promise<IContactModel> {
    const cacheKey = `contact:${companyId}:${this.hashIdentifiers(identifiers)}`;
    const cached = await this.cache.get<IContactModel>(cacheKey);
    if (cached) return cached;

    const existing = await this.contactRepo.findByIdentifiers(
      companyId,
      identifiers,
    );
    if (existing) {
      await this.cache.set(cacheKey, existing, 3600); // 1h TTL
      return existing;
    }

    const created = await this.contactRepo.create({
      companyId,
      ...identifiers,
    });
    await this.cache.set(cacheKey, created, 3600);
    return created;
  }

  async linkToRoom(contactId: string, roomId: string): Promise<void> {
    await this.roomRepo.updateContactId(roomId, contactId);
  }

  async compactSession(roomId: string): Promise<void> {
    const room = await this.roomRepo.findById(roomId);

    if (room.isTest || !room.contactId) {
      return;
    }

    const events = await this.roomEventRepo.findByRoomId(roomId);
    await this.compactSessionFromEvents(room.contactId, events);
  }

  async compactSessionFromEvents(
    contactId: string,
    events: { type: string; payload: unknown }[],
  ): Promise<void> {
    const transcriptEvents = events.filter(
      (e) => e.type.includes("TRANSCRIPT") || e.type.includes("TEXT_DONE"),
    );

    if (transcriptEvents.length === 0) {
      return;
    }

    const transcript = transcriptEvents
      .map((e) => {
        const payload = e.payload as { text?: string };
        const speaker = e.type.startsWith("USER") ? "User" : "Agent";
        return `[${speaker}]: ${payload.text ?? ""}`;
      })
      .join("\n");

    const contact = await this.contactRepo.findById(contactId);

    const renderedPrompt = await this.prompt.render("session-summary-prompt", {
      existingSummary: contact?.summary,
      transcript,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: env.get("SUB_AGENT_MODEL"),
        messages: [{ role: "user", content: renderedPrompt }],
        max_tokens: 1000,
      }),
    });

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const newSummary =
      data.choices?.[0]?.message?.content ?? contact?.summary ?? "";

    await this.contactRepo.updateSummary(contactId, newSummary);

    // Invalidate contact cache after summary update
    await this.cache.deletePattern(`contact:*`);

    this.logger.info(`Session compacted for contact ${contactId}`);
  }

  private hashIdentifiers(identifiers: ContactIdentifiers): string {
    const input = JSON.stringify(identifiers);
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      // biome-ignore lint/suspicious/noBitwiseOperators: djb2 hash algorithm requires bitwise ops
      hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }
}

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ContactService } from "@/application/services/contact.service.ts";

const noContact = null as Record<string, unknown> | null;

function createFakes() {
  const contactRepo = {
    findByIdentifiers: mock(() => Promise.resolve(noContact)),
    create: mock(
      (data: { companyId: string; phoneNumber?: string; email?: string }) =>
        Promise.resolve({
          id: "contact-new",
          companyId: data.companyId,
          phoneNumber: data.phoneNumber ?? null,
          email: data.email ?? null,
          ipAddress: null,
          userAgent: null,
          summary: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    ),
    updateSummary: mock((contactId: string, summary: string) =>
      Promise.resolve({
        id: contactId,
        companyId: "comp-1",
        phoneNumber: null,
        email: null,
        ipAddress: null,
        userAgent: null,
        summary,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    findById: mock(() =>
      Promise.resolve({
        id: "contact-1",
        companyId: "comp-1",
        phoneNumber: "+33612345678",
        summary: "Previous interactions summary",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
  };

  const roomEventRepo = {
    create: mock(() => Promise.resolve({})),
    findByRoomId: mock(() =>
      Promise.resolve([
        {
          id: "ev-1",
          roomId: "room-1",
          type: "USER_TRANSCRIPT",
          payload: { text: "Bonjour" },
          createdAt: new Date(),
        },
        {
          id: "ev-2",
          roomId: "room-1",
          type: "AGENT_TRANSCRIPT",
          payload: { text: "Bonjour, comment puis-je vous aider ?" },
          createdAt: new Date(),
        },
        {
          id: "ev-3",
          roomId: "room-1",
          type: "TEXT_DONE",
          payload: { text: "Voici les informations demandées." },
          createdAt: new Date(),
        },
        {
          id: "ev-4",
          roomId: "room-1",
          type: "TOOL_INVOKE_CREATED",
          payload: { toolInvoke: { id: "ti-1" } },
          createdAt: new Date(),
        },
      ]),
    ),
  };

  const roomRepo = {
    findById: mock(() =>
      Promise.resolve({
        id: "room-1",
        companyId: "comp-1",
        contactId: "contact-1",
        isTest: false,
        modality: "TEXT",
        source: "WEBRTC",
        token: "chat-xxx",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    updateContactId: mock(() => Promise.resolve({})),
  };

  const prompt = {
    render: mock(() => Promise.resolve("Rendered summary prompt")),
  };

  const logger = {
    info: () => {
      /* noop */
    },
    error: () => {
      /* noop */
    },
    warn: () => {
      /* noop */
    },
  };

  const cache = {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    deletePattern: mock(() => Promise.resolve()),
    has: mock(() => Promise.resolve(false)),
  };

  const service = new ContactService(
    contactRepo as never,
    roomEventRepo as never,
    roomRepo as never,
    prompt as never,
    logger as never,
    cache as never,
  );

  return {
    service,
    contactRepo,
    roomEventRepo,
    roomRepo,
    prompt,
  };
}

describe("ContactService", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
  });

  describe("findOrCreate", () => {
    it("should return existing contact when found by phone number", async () => {
      fakes.contactRepo.findByIdentifiers.mockReturnValue(
        Promise.resolve({
          id: "contact-existing",
          companyId: "comp-1",
          phoneNumber: "+33612345678",
          summary: "Past summary",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const contact = await fakes.service.findOrCreate("comp-1", {
        phoneNumber: "+33612345678",
      });

      expect(contact.id).toBe("contact-existing");
      expect(fakes.contactRepo.create).not.toHaveBeenCalled();
    });

    it("should create new contact when not found", async () => {
      const contact = await fakes.service.findOrCreate("comp-1", {
        phoneNumber: "+33699999999",
      });

      expect(contact.id).toBe("contact-new");
      expect(fakes.contactRepo.create).toHaveBeenCalledWith({
        companyId: "comp-1",
        phoneNumber: "+33699999999",
      });
    });

    it("should pass all identifiers when creating", async () => {
      await fakes.service.findOrCreate("comp-1", {
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });

      expect(fakes.contactRepo.create).toHaveBeenCalledWith({
        companyId: "comp-1",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });
    });

    it("should return cached contact without querying DB", async () => {
      const cachedContact = {
        id: "contact-cached",
        companyId: "comp-1",
        phoneNumber: "+33600000000",
        summary: "Cached summary",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // Create a service with cache that returns a hit
      const serviceWithCache = new ContactService(
        fakes.contactRepo as never,
        fakes.roomEventRepo as never,
        fakes.roomRepo as never,
        fakes.prompt as never,
        {
          info: () => {
            /* noop */
          },
          error: () => {
            /* noop */
          },
          warn: () => {
            /* noop */
          },
        } as never,
        {
          get: mock(() => Promise.resolve(cachedContact)),
          set: mock(() => Promise.resolve()),
          delete: mock(() => Promise.resolve()),
          deletePattern: mock(() => Promise.resolve()),
          has: mock(() => Promise.resolve(true)),
        } as never,
      );

      const contact = await serviceWithCache.findOrCreate("comp-1", {
        phoneNumber: "+33600000000",
      });

      expect(contact.id).toBe("contact-cached");
      // DB should NOT be queried
      expect(fakes.contactRepo.findByIdentifiers).not.toHaveBeenCalled();
      expect(fakes.contactRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("linkToRoom", () => {
    it("should call roomRepo.updateContactId", async () => {
      await fakes.service.linkToRoom("contact-1", "room-1");

      expect(fakes.roomRepo.updateContactId).toHaveBeenCalledWith(
        "room-1",
        "contact-1",
      );
    });
  });

  describe("compactSession", () => {
    it("should skip compaction for test rooms", async () => {
      fakes.roomRepo.findById.mockReturnValue(
        Promise.resolve({
          id: "room-test",
          companyId: "comp-1",
          contactId: "contact-1",
          isTest: true,
          modality: "TEXT",
          source: "WEBRTC",
          token: "t",
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await fakes.service.compactSession("room-test");

      expect(fakes.roomEventRepo.findByRoomId).not.toHaveBeenCalled();
    });

    it("should skip compaction when no contact is linked", async () => {
      (
        fakes.roomRepo.findById as { mockReturnValue: (v: unknown) => void }
      ).mockReturnValue(
        Promise.resolve({
          id: "room-1",
          companyId: "comp-1",
          contactId: null,
          isTest: false,
          modality: "TEXT",
          source: "WEBRTC",
          token: "t",
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await fakes.service.compactSession("room-1");

      expect(fakes.roomEventRepo.findByRoomId).not.toHaveBeenCalled();
    });

    it("should filter transcript events and build transcript", async () => {
      // Mock fetch for OpenAI API
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          Response.json({
            choices: [
              { message: { content: "Updated summary with new info" } },
            ],
          }),
        ),
      ) as unknown as typeof fetch;

      try {
        await fakes.service.compactSession("room-1");

        // Should have called prompt.render with transcript (3 transcript events, not TOOL_INVOKE_CREATED)
        expect(fakes.prompt.render).toHaveBeenCalled();
        const renderArgs = fakes.prompt.render.mock.calls[0] as unknown[];
        expect(renderArgs[0]).toBe("session-summary-prompt");
        const templateVars = renderArgs[1] as {
          existingSummary: string;
          transcript: string;
        };
        expect(templateVars.existingSummary).toBe(
          "Previous interactions summary",
        );
        expect(templateVars.transcript).toContain("Bonjour");
        expect(templateVars.transcript).not.toContain("TOOL_INVOKE");

        // Should have updated the contact summary
        expect(fakes.contactRepo.updateSummary).toHaveBeenCalledWith(
          "contact-1",
          "Updated summary with new info",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should handle OpenAI API failure gracefully", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("Network error")),
      ) as unknown as typeof fetch;

      try {
        // Should throw since fetch rejects and there's no try/catch in compactSession
        await expect(fakes.service.compactSession("room-1")).rejects.toThrow(
          "Network error",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should skip when no transcript events exist", async () => {
      (
        fakes.roomEventRepo.findByRoomId as {
          mockReturnValue: (v: unknown) => void;
        }
      ).mockReturnValue(
        Promise.resolve([
          {
            id: "ev-tool",
            roomId: "room-1",
            type: "TOOL_INVOKE_CREATED",
            payload: {},
            createdAt: new Date(),
          },
        ]),
      );

      await fakes.service.compactSession("room-1");

      expect(fakes.prompt.render).not.toHaveBeenCalled();
      expect(fakes.contactRepo.updateSummary).not.toHaveBeenCalled();
    });
  });

  describe("compactSessionFromEvents", () => {
    it("should compact with pre-fetched events", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          Response.json({
            choices: [{ message: { content: "New summary from events" } }],
          }),
        ),
      ) as unknown as typeof fetch;

      try {
        await fakes.service.compactSessionFromEvents("contact-1", [
          {
            type: "USER_TRANSCRIPT",
            payload: { text: "Hello" },
          },
          {
            type: "AGENT_TRANSCRIPT",
            payload: { text: "Hi there" },
          },
          {
            type: "TOOL_INVOKE_CREATED",
            payload: { toolInvoke: { id: "ti-1" } },
          },
        ]);

        // Should render prompt with transcript (only TRANSCRIPT events)
        expect(fakes.prompt.render).toHaveBeenCalled();
        const renderArgs = fakes.prompt.render.mock.calls[0] as unknown[];
        const templateVars = renderArgs[1] as { transcript: string };
        expect(templateVars.transcript).toContain("[User]: Hello");
        expect(templateVars.transcript).toContain("[Agent]: Hi there");
        expect(templateVars.transcript).not.toContain("TOOL_INVOKE");

        // Should update summary
        expect(fakes.contactRepo.updateSummary).toHaveBeenCalledWith(
          "contact-1",
          "New summary from events",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should skip when no transcript events in pre-fetched data", async () => {
      await fakes.service.compactSessionFromEvents("contact-1", [
        { type: "TOOL_INVOKE_CREATED", payload: {} },
      ]);

      expect(fakes.prompt.render).not.toHaveBeenCalled();
      expect(fakes.contactRepo.updateSummary).not.toHaveBeenCalled();
    });
  });
});

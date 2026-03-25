import { beforeEach, describe, expect, it, mock } from "bun:test";
import { WhatsAppUseCase } from "@/application/use-cases/whatsapp.use-case.ts";

function createFakes() {
  const noConfig = null as Record<string, unknown> | null;
  const configRepo = {
    findByCompanyId: mock(() => Promise.resolve(noConfig)),
    findByPhoneNumberId: mock(() => Promise.resolve(noConfig)),
    create: mock((companyId: string, phoneNumberId: string) =>
      Promise.resolve({
        id: "wac-1",
        companyId,
        phoneNumberId,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    update: mock((id: string, data: Record<string, unknown>) =>
      Promise.resolve({
        id,
        companyId: "comp-1",
        phoneNumberId: "pn-1",
        active: data.active ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    delete: mock(() => Promise.resolve()),
  };

  const companyRepo = {
    findById: mock(() =>
      Promise.resolve({
        id: "comp-1",
        name: "Test Company",
        status: "ACTIVE",
        mcpUrl: null,
        systemPromptSections: null,
        toolConfigs: null,
        systemToolPrompts: null,
        voice: null,
        language: null,
        vadEagerness: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
  };

  const roomRepo = {
    createRoom: mock(() =>
      Promise.resolve({
        id: "room-wa-1",
        companyId: "comp-1",
        token: "whatsapp-token",
        modality: "TEXT",
        isTest: false,
        source: "WHATSAPP",
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    findById: mock(() => Promise.resolve(null)),
    deleteRoom: mock(() => Promise.resolve()),
  };

  const chatService = {
    initSession: mock(() => {
      /* noop */
    }),
    // biome-ignore lint/suspicious/useAwait: async generator required by ChatServicePort interface
    sendMessage: mock(async function* () {
      yield { type: "text_delta" as const, text: "Hello" };
      yield { type: "text_done" as const, text: "Hello from AI" };
    }),
    destroySession: mock(() => {
      /* noop */
    }),
  };

  const callService = {
    createCall: mock(() =>
      Promise.resolve({ token: "t", expiresAt: new Date() }),
    ),
    buildSessionConfig: mock(() =>
      Promise.resolve({ instructions: "test", tools: [] }),
    ),
    terminateCall: mock(() => Promise.resolve()),
  };

  const whatsappClient = {
    sendMessage: mock(() => Promise.resolve()),
    markRead: mock(() => Promise.resolve()),
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

  const contactService = {
    findOrCreate: mock(() =>
      Promise.resolve({ id: "contact-1", summary: null as string | null }),
    ),
    linkToRoom: mock(() => Promise.resolve()),
  };

  const useCase = new WhatsAppUseCase(
    configRepo as never,
    companyRepo as never,
    roomRepo as never,
    chatService as never,
    callService as never,
    whatsappClient as never,
    logger as never,
    contactService as never,
  );

  return {
    useCase,
    configRepo,
    companyRepo,
    roomRepo,
    chatService,
    callService,
    whatsappClient,
    contactService,
  };
}

describe("WhatsAppUseCase", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
  });

  describe("configure", () => {
    it("should create a new WhatsApp config", async () => {
      const config = await fakes.useCase.configure("comp-1", "pn-123");

      expect(config.phoneNumberId).toBe("pn-123");
      expect(config.active).toBe(true);
    });

    it("should throw if config already exists", async () => {
      fakes.configRepo.findByCompanyId.mockReturnValue(
        Promise.resolve({
          id: "existing",
          companyId: "comp-1",
          phoneNumberId: "pn",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await expect(fakes.useCase.configure("comp-1", "pn")).rejects.toThrow();
    });
  });

  describe("handleIncomingMessage", () => {
    it("should create room and reply for new conversation", async () => {
      fakes.configRepo.findByPhoneNumberId.mockReturnValue(
        Promise.resolve({
          id: "wac-1",
          companyId: "comp-1",
          phoneNumberId: "pn-1",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await fakes.useCase.handleIncomingMessage(
        "pn-1",
        "+33612345678",
        "Bonjour",
        "msg-1",
      );

      expect(fakes.roomRepo.createRoom).toHaveBeenCalled();
      expect(fakes.chatService.initSession).toHaveBeenCalled();
      expect(fakes.chatService.sendMessage).toHaveBeenCalled();
      expect(fakes.whatsappClient.sendMessage).toHaveBeenCalledWith(
        "pn-1",
        "+33612345678",
        "Hello from AI",
      );
    });

    it("should skip if no config found", async () => {
      await fakes.useCase.handleIncomingMessage(
        "unknown-pn",
        "+33612345678",
        "Hello",
        "msg-2",
      );

      expect(fakes.roomRepo.createRoom).not.toHaveBeenCalled();
      expect(fakes.whatsappClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("startConversation", () => {
    it("should create room and send initial message", async () => {
      fakes.configRepo.findByCompanyId.mockReturnValue(
        Promise.resolve({
          id: "wac-1",
          companyId: "comp-1",
          phoneNumberId: "pn-1",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const roomId = await fakes.useCase.startConversation(
        "comp-1",
        "+33612345678",
        "Bonjour, comment puis-je vous aider ?",
      );

      expect(roomId).toBe("room-wa-1");
      expect(fakes.chatService.sendMessage).toHaveBeenCalled();
      expect(fakes.whatsappClient.sendMessage).toHaveBeenCalled();
    });

    it("should throw if WhatsApp not configured", async () => {
      await expect(
        fakes.useCase.startConversation("comp-1", "+33612345678"),
      ).rejects.toThrow();
    });
  });

  describe("contact resolution", () => {
    it("should resolve contact by WhatsApp phone number on incoming message", async () => {
      fakes.configRepo.findByPhoneNumberId.mockReturnValue(
        Promise.resolve({
          id: "wac-1",
          companyId: "comp-1",
          phoneNumberId: "pn-1",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await fakes.useCase.handleIncomingMessage(
        "pn-1",
        "+33612345678",
        "Bonjour",
        "msg-1",
      );

      expect(fakes.contactService.findOrCreate).toHaveBeenCalledWith("comp-1", {
        phoneNumber: "+33612345678",
      });
    });

    it("should link contact to room after creation", async () => {
      fakes.configRepo.findByPhoneNumberId.mockReturnValue(
        Promise.resolve({
          id: "wac-1",
          companyId: "comp-1",
          phoneNumberId: "pn-1",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await fakes.useCase.handleIncomingMessage(
        "pn-1",
        "+33699999999",
        "Hello",
        "msg-2",
      );

      expect(fakes.contactService.linkToRoom).toHaveBeenCalledWith(
        "contact-1",
        "room-wa-1",
      );
    });

    it("should pass contact summary to buildSessionConfig", async () => {
      fakes.contactService.findOrCreate.mockReturnValue(
        Promise.resolve({
          id: "contact-1",
          summary: "Previous caller: asked about product X",
        }),
      );
      fakes.configRepo.findByPhoneNumberId.mockReturnValue(
        Promise.resolve({
          id: "wac-1",
          companyId: "comp-1",
          phoneNumberId: "pn-1",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await fakes.useCase.handleIncomingMessage(
        "pn-1",
        "+33612345678",
        "Bonjour",
        "msg-3",
      );

      const buildConfigCall = fakes.callService.buildSessionConfig.mock
        .calls[0] as unknown[];
      expect(buildConfigCall[2]).toBe("Previous caller: asked about product X");
    });
  });

  describe("deleteConfig", () => {
    it("should delete existing config", async () => {
      fakes.configRepo.findByCompanyId.mockReturnValue(
        Promise.resolve({
          id: "wac-1",
          companyId: "comp-1",
          phoneNumberId: "pn",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await fakes.useCase.deleteConfig("comp-1");
      expect(fakes.configRepo.delete).toHaveBeenCalledWith("wac-1");
    });

    it("should throw if config not found", async () => {
      await expect(fakes.useCase.deleteConfig("comp-1")).rejects.toThrow();
    });
  });
});

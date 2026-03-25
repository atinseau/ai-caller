import { beforeEach, describe, expect, it, mock } from "bun:test";
import { TelephonyUseCase } from "@/application/use-cases/telephony.use-case.ts";

function createFakes() {
  const phoneNumberRepo = {
    findByPhoneNumber: mock(() => Promise.resolve(null)),
  };

  const companyRepo = {
    findById: mock(() =>
      Promise.resolve({
        id: "comp-1",
        name: "Test Company",
        status: "ACTIVE",
        mcpUrl: "http://mcp.test",
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
        id: "room-tel-1",
        companyId: "comp-1",
        token: "telephony",
        modality: "AUDIO",
        isTest: false,
        source: "TELEPHONY",
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    updateTwilioStreamSid: mock(() => Promise.resolve({})),
    updateContactId: mock(() => Promise.resolve({})),
  };

  const mockConfig = {
    instructions: "test",
    tools: [],
    voice: "marin",
    mcpUrl: "http://mcp.test",
  };

  const callService = {
    createCall: mock(() =>
      Promise.resolve({ token: "t", expiresAt: new Date() }),
    ),
    buildSessionConfig: mock(() =>
      Promise.resolve({ instructions: "test", tools: [] }),
    ),
    buildAudioProviderConfig: mock(() => Promise.resolve(mockConfig)),
    terminateCall: mock(() => Promise.resolve()),
  };

  const telephonyGateway = {
    initCall: mock(() => Promise.resolve()),
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
      Promise.resolve({ id: "contact-tel-1", summary: null as string | null }),
    ),
    linkToRoom: mock(() => Promise.resolve()),
  };

  const useCase = new TelephonyUseCase(
    phoneNumberRepo as never,
    companyRepo as never,
    roomRepo as never,
    callService as never,
    telephonyGateway as never,
    logger as never,
    contactService as never,
  );

  return {
    useCase,
    companyRepo,
    roomRepo,
    callService,
    telephonyGateway,
    contactService,
  };
}

const sendToTwilio = mock(() => {
  /* noop */
});

describe("TelephonyUseCase — contact resolution", () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
    sendToTwilio.mockClear();
  });

  it("should resolve contact by caller phone number", async () => {
    await fakes.useCase.handleIncomingCall(
      "comp-1",
      "stream-123",
      sendToTwilio,
      "+33612345678",
    );

    expect(fakes.contactService.findOrCreate).toHaveBeenCalledWith("comp-1", {
      phoneNumber: "+33612345678",
    });
  });

  it("should link contact to room after creation", async () => {
    await fakes.useCase.handleIncomingCall(
      "comp-1",
      "stream-456",
      sendToTwilio,
      "+33699999999",
    );

    expect(fakes.contactService.linkToRoom).toHaveBeenCalledWith(
      "contact-tel-1",
      "room-tel-1",
    );
  });

  it("should pass contact summary to buildAudioProviderConfig", async () => {
    fakes.contactService.findOrCreate.mockReturnValue(
      Promise.resolve({
        id: "contact-tel-1",
        summary: "Returning caller: issue with order #42",
      }),
    );

    await fakes.useCase.handleIncomingCall(
      "comp-1",
      "stream-789",
      sendToTwilio,
      "+33612345678",
    );

    const buildConfigCall = fakes.callService.buildAudioProviderConfig.mock
      .calls[0] as unknown[];
    expect(buildConfigCall[1]).toBe("Returning caller: issue with order #42");
  });

  it("should skip contact resolution when no caller number", async () => {
    await fakes.useCase.handleIncomingCall(
      "comp-1",
      "stream-no-number",
      sendToTwilio,
    );

    expect(fakes.contactService.findOrCreate).not.toHaveBeenCalled();
    expect(fakes.contactService.linkToRoom).not.toHaveBeenCalled();
  });

  it("should still create room and init call without caller number", async () => {
    await fakes.useCase.handleIncomingCall(
      "comp-1",
      "stream-no-number",
      sendToTwilio,
    );

    expect(fakes.roomRepo.createRoom).toHaveBeenCalled();
    expect(fakes.telephonyGateway.initCall).toHaveBeenCalled();
  });

  it("should pass undefined summary to buildAudioProviderConfig when no contact", async () => {
    await fakes.useCase.handleIncomingCall(
      "comp-1",
      "stream-no-number",
      sendToTwilio,
    );

    const buildConfigCall = fakes.callService.buildAudioProviderConfig.mock
      .calls[0] as unknown[];
    expect(buildConfigCall[1]).toBeUndefined();
  });
});

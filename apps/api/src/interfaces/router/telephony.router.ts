import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { TelephonyUseCase } from "@/application/use-cases/telephony.use-case.ts";
import { TelephonyGatewayPort } from "@/domain/ports/telephony-gateway.port.ts";
import { PhoneNumberRepositoryPort } from "@/domain/repositories/phone-number-repository.port.ts";
import { env } from "@/infrastructure/config/env.ts";
import { container } from "@/infrastructure/di/container.ts";

export const telephonyRouter = new Hono();

/**
 * POST /incoming — Twilio voice webhook (PUBLIC, no auth)
 * Receives the incoming call notification and returns TwiML to connect Media Streams.
 */
telephonyRouter.post("/incoming", async (ctx) => {
  const body = await ctx.req.parseBody();
  const toNumber = body.To as string;
  const callerNumber = body.From as string | undefined;

  const phoneNumberRepo = container.get(PhoneNumberRepositoryPort);
  const phoneNumber = await phoneNumberRepo.findByPhoneNumber(toNumber);

  if (!phoneNumber) {
    return ctx.text(
      "<Response><Say>This number is not configured.</Say></Response>",
      200,
      { "Content-Type": "text/xml" },
    );
  }

  const webhookBaseUrl = env.get("TWILIO_WEBHOOK_BASE_URL") ?? "";

  const twiml = `<Response><Connect><Stream url="wss://${new URL(webhookBaseUrl).host}/api/telephony/ws"><Parameter name="companyId" value="${phoneNumber.companyId}" /><Parameter name="callerNumber" value="${callerNumber ?? ""}" /></Stream></Connect></Response>`;

  return ctx.text(twiml, 200, { "Content-Type": "text/xml" });
});

/**
 * GET /ws — Twilio Media Streams WebSocket (PUBLIC, no auth)
 * Handles the bidirectional audio bridge between Twilio and OpenAI.
 */
telephonyRouter.get(
  "/ws",
  upgradeWebSocket(() => {
    let roomId: string | null = null;

    return {
      onMessage(evt, ws) {
        try {
          const msg = JSON.parse(typeof evt.data === "string" ? evt.data : "");

          if (msg.event === "start") {
            const companyId = msg.start?.customParameters?.companyId;
            const streamSid = msg.start?.streamSid;
            const callerNumber =
              msg.start?.customParameters?.callerNumber || undefined;

            if (!companyId || !streamSid) {
              ws.close(1008, "Missing companyId or streamSid");
              return;
            }

            const sendToTwilio = (message: Record<string, unknown>) => {
              try {
                ws.send(JSON.stringify(message));
              } catch {
                /* WS may be closed */
              }
            };

            const telephonyUseCase = container.get(TelephonyUseCase);
            telephonyUseCase
              .handleIncomingCall(
                companyId,
                streamSid,
                sendToTwilio,
                callerNumber,
              )
              .then((id) => {
                roomId = id;
              })
              .catch(() => {
                ws.close(1011, "Failed to initialize call");
              });

            return;
          }

          if (msg.event === "media" && roomId) {
            const telephonyGateway = container.get(TelephonyGatewayPort);
            telephonyGateway.forwardAudio(roomId, msg.media?.payload ?? "");
            return;
          }

          if (msg.event === "mark" && roomId) {
            const telephonyGateway = container.get(TelephonyGatewayPort);
            telephonyGateway.handleMark(roomId, msg.mark?.name ?? "");
            return;
          }

          if (msg.event === "stop" && roomId) {
            const telephonyGateway = container.get(TelephonyGatewayPort);
            telephonyGateway.closeCall(roomId);
            roomId = null;
          }
        } catch {
          /* Ignore malformed messages */
        }
      },

      onClose() {
        if (roomId) {
          const telephonyGateway = container.get(TelephonyGatewayPort);
          telephonyGateway.closeCall(roomId);
          roomId = null;
        }
      },
    };
  }),
);

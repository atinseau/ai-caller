import { injectable } from "inversify";
import type { RealtimeRoomServicePort } from "../../domain/ports/realtime-room-service.port";

@injectable()
export class SandboxRealtimeRoomService implements RealtimeRoomServicePort {
  private readonly channelMap = new WeakMap<
    RTCPeerConnection,
    RTCDataChannel
  >();

  async createRoom(_companyId: string) {
    const pc = new RTCPeerConnection();

    const dcEventTarget = new EventTarget();
    const dc = Object.assign(dcEventTarget, {
      readyState: "open",
      send: (data: string) => {
        dcEventTarget.dispatchEvent(
          new MessageEvent("message", {
            data,
          }),
        );
      },
      close: () => {
        dcEventTarget.dispatchEvent(new Event("close"));
      },
    }) as RTCDataChannel;

    this.channelMap.set(pc, dc);

    return {
      roomToken: "sandbox-token",
      roomId: crypto.randomUUID(),
      pc,
      dc,
    };
  }

  async attachCallToRoom(
    _pc: RTCPeerConnection,
    _roomId: string,
    _roomToken: string,
  ): Promise<void> {
    const dc = this.channelMap.get(_pc);
    if (!dc) {
      return;
    }

    // Sandbox mode: no WebRTC handshake, simulate immediate readiness.
    dc.dispatchEvent(new Event("open"));

    const mockMessages = [
      {
        type: "sandbox.message",
        payload: {
          role: "assistant",
          text: "Bonjour, ceci est un call sandbox.",
        },
      },
      {
        type: "sandbox.message",
        payload: {
          role: "assistant",
          text: "Vous pouvez tester vos flows ici sans OpenAI.",
        },
      },
    ];

    mockMessages.forEach((message, index) => {
      setTimeout(
        () => {
          dc.dispatchEvent(
            new MessageEvent("message", {
              data: JSON.stringify(message),
            }),
          );
        },
        400 * (index + 1),
      );
    });
  }
}

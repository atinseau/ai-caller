

export abstract class AudioCallServicePort {
  abstract getToken(companyId: string): Promise<string>;
  abstract startCall(pc: RTCPeerConnection, token: string): Promise<void>;
}

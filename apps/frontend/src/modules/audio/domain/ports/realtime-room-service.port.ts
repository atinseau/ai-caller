export abstract class RealtimeRoomServicePort {

  abstract createRoom(companyId: string): Promise<{
    pc: RTCPeerConnection,
    dc: RTCDataChannel,
    roomId: string,
    roomToken: string
  }>

  abstract attachCallToRoom(
    pc: RTCPeerConnection,
    roomId: string,
    roomToken: string
  ): Promise<void>
}

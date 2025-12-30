import { AudioStreamPort } from "@/domain/audio-stream.port"
import { Container } from "inversify"
import { AudioStream } from "../browser/audio-stream"
import { RealtimeCallMachine } from "@/modules/audio/application/machine/realtime-call.machine"
import { RealtimeWebRtcUseCase } from "@/modules/audio/application/use-cases/realtime-webrtc.use-case"
import { RealtimeRoomServicePort } from "@/modules/audio/domain/ports/realtime-room-service.port"
import { RealtimeOpenAiRoomService } from "@/modules/audio/application/services/realtime-openai-room.service"

export const container = new Container()

container.bind(AudioStreamPort).to(AudioStream).inSingletonScope()

// Audio module
// ----------------------------------------------------

// Ports
container.bind(RealtimeRoomServicePort).to(RealtimeOpenAiRoomService).inSingletonScope()

// Use Cases
container.bind(RealtimeCallMachine).toSelf().inSingletonScope()
container.bind(RealtimeWebRtcUseCase).toSelf().inSingletonScope()


// ----------------------------------------------------

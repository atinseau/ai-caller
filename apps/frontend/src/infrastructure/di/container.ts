import { AudioStreamPort } from "@/domain/audio-stream.port"
import { Container } from "inversify"
import { AudioStream } from "../browser/audio-stream"
import { AudioCallMachine } from "@/modules/audio/application/machine/audio-call.machine"
import { AudioWebRtcUseCase } from "@/modules/audio/application/use-cases/audio-webrtc.use-case"
import { AudioCallServicePort } from "@/modules/audio/domain/ports/audio-call-service.port"
import { AudioCallService } from "@/modules/audio/infrastructure/services/audio-call.service"

export const container = new Container()

container.bind(AudioStreamPort).to(AudioStream).inSingletonScope()

// Audio module
// ----------------------------------------------------

// Ports
container.bind(AudioCallServicePort).to(AudioCallService).inSingletonScope()

// Use Cases
container.bind(AudioCallMachine).toSelf().inSingletonScope()
container.bind(AudioWebRtcUseCase).toSelf().inSingletonScope()


// ----------------------------------------------------

import { Button } from "@/shared/components/ui/button"
import { useAudioCall } from "@/modules/audio/ui/hooks/useAudioCall"

export function AudioPage() {
  const { startCall, stopCall, state } = useAudioCall()

  return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
    <div className="flex gap-2">
      <Button onClick={startCall}>Start audio call</Button>
      <Button variant="destructive" onClick={stopCall}>Stop audio call</Button>
    </div>
    <p>{JSON.stringify(state.value)}</p>
  </div>
}

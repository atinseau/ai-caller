import { useAudioCall } from "@/modules/audio/ui/hooks/useAudioCall"
import { Button } from "@/shared/components/ui/button"
import { useRef, type RefObject } from "react"

export function AudioPage() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { startCall, stopCall, sendMessage, state } = useAudioCall(audioRef as RefObject<HTMLAudioElement>)

  const handleMessageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const input = form.elements.namedItem("message") as HTMLInputElement
    const message = input.value.trim()
    if (message) {
      sendMessage(message)
      input.value = ""
    }
  }

  const handleCompanyIdSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const input = form.elements.namedItem("companyId") as HTMLInputElement
    const companyId = input.value.trim()

    if (!companyId.length) {
      console.warn("Company ID is required")
      return
    }

    startCall(companyId)
    input.value = ""
  }

  return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">

    {typeof state.value === 'string' && state.value === 'idle'
      ? <form className="flex gap-2" onSubmit={handleCompanyIdSubmit}>
        <input
          name="companyId"
          type="text"
          placeholder="enter company id..."
          className="border rounded px-3 py-2 w-64"
          autoComplete="off"
        />
        <Button
          type="submit"
          className="h-[42px] flex items-center justify-center"
        >
          Send
        </Button>
      </form>
      : null
    }


    {typeof state.value === 'object' && state.value.callReady === "streaming"
      ? <Button variant="destructive" onClick={stopCall}>Stop audio call</Button>
      : null
    }

    <audio ref={audioRef} autoPlay className="hidden" />
    <p>{JSON.stringify(state.value)}</p>

    {typeof state.value === 'object' && state.value.callReady === "streaming"
      ? <form
        className="flex gap-2"
        onSubmit={handleMessageSubmit}
      >
        <input
          name="message"
          type="text"
          placeholder="Type your message..."
          className="border rounded px-3 py-2 w-64"
          autoComplete="off"
        />
        <Button
          type="submit"
          className="h-[42px] flex items-center justify-center"
        >
          Send
        </Button>
      </form>
      : null
    }

  </div>
}

import { Button } from "@/shared/components/ui/button"
import { useRef, type RefObject } from "react"
import { useCompanies } from "@/shared/hooks/useCompanies"
import { useRealtimeCall } from "../hooks/useRealtimeCall"
import { RealtimeCallMachineState } from "../../domain/enums/realtime-call-machine-state.enum"

export function RealtimeCallPage() {
  const { companies, isLoading } = useCompanies()

  const audioRef = useRef<HTMLAudioElement>(null)
  const { start, stop, state, sendMessage } = useRealtimeCall(audioRef as RefObject<HTMLAudioElement>)

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

    start(companyId)
    input.value = ""
  }


  return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
    {isLoading
      ? <p>Loading companies...</p>
      : <div>
        <h2 className="text-lg mb-2">Available Companies:</h2>
        {companies && companies.length > 0
          ? (
            <ul className="list-disc list-inside">
              {companies.map(company => (
                <li key={company.id}>
                  ID: {company.id}, Name: {company.name}
                </li>
              ))}
            </ul>
          )
          : <p>No companies available.</p>
        }
      </div>
    }

    {typeof state.value === 'string' && state.value === RealtimeCallMachineState.IDLE
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


    {typeof state.value === "object" && state.value[RealtimeCallMachineState.CALLING] === RealtimeCallMachineState.CONNECTED
      ? <Button variant="destructive" className="h-[42px] flex items-center justify-center" onClick={stop}> End Call </Button>
      : null
    }

    <audio ref={audioRef} autoPlay className="hidden" />
    <p>{JSON.stringify(state.value)}</p>

    {typeof state.value === 'object' && state.value[RealtimeCallMachineState.CALLING] === RealtimeCallMachineState.CONNECTED
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

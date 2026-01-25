import { type RefObject, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useCompanies } from "@/shared/hooks/useCompanies";
import { RealtimeCallMachineState } from "../../domain/enums/realtime-call-machine-state.enum";
import { RealtimeCallMode } from "../../domain/enums/realtime-call-mode.enum";
import { MuteToggleButton } from "../components/MuteToggleButton";
import { useRealtimeCall } from "../hooks/useRealtimeCall";

type RealtimeCallPageProps = {
  initialMode?: RealtimeCallMode;
};

export function RealtimeCallPage({
  initialMode = RealtimeCallMode.DEVELOPMENT,
}: RealtimeCallPageProps) {
  const { companies, isLoading } = useCompanies();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [mode, setMode] = useState<RealtimeCallMode>(initialMode);
  const { start, stop, state, sendMessage, muteToggle } = useRealtimeCall(
    audioRef as RefObject<HTMLAudioElement>,
  );

  const handleMessageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    const message = input.value.trim();
    if (message) {
      sendMessage(message);
      input.value = "";
    }
  };

  const handleCompanyIdSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("companyId") as HTMLInputElement;
    const companyId = input.value.trim();

    if (!companyId.length) {
      console.warn("Company ID is required");
      return;
    }

    start(companyId, mode);
    input.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      {isLoading ? (
        <p>Loading companies...</p>
      ) : (
        <div>
          <h2 className="text-lg mb-2">Available Companies:</h2>
          {companies && companies.length > 0 ? (
            <ul className="list-disc list-inside">
              {companies.map((company) => (
                <li key={company.id}>
                  ID: {company.id}, Name: {company.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>No companies available.</p>
          )}
        </div>
      )}

      {typeof state.value === "string" &&
      state.value === RealtimeCallMachineState.IDLE ? (
        <form className="flex flex-wrap gap-2" onSubmit={handleCompanyIdSubmit}>
          <Input
            name="companyId"
            type="text"
            placeholder="enter company id..."
            className="w-64"
            autoComplete="off"
          />
          <select
            name="mode"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as RealtimeCallMode)
            }
          >
            <option value={RealtimeCallMode.DEVELOPMENT}>
              Dev (OpenAI realtime)
            </option>
            <option value={RealtimeCallMode.SANDBOX}>Sandbox (mock)</option>
          </select>
          <Button
            type="submit"
            className="h-10.5 flex items-center justify-center"
          >
            Send
          </Button>
        </form>
      ) : null}

      {typeof state.value === "object" &&
      state.value[RealtimeCallMachineState.CALLING] ===
        RealtimeCallMachineState.CONNECTED ? (
        <Button
          variant="destructive"
          className="h-10.5 flex items-center justify-center"
          onClick={stop}
        >
          {" "}
          End Call{" "}
        </Button>
      ) : null}

      <audio ref={audioRef} autoPlay className="hidden">
        <track kind="captions" />
      </audio>

      <p>{JSON.stringify(state.value)}</p>

      {typeof state.value === "object" &&
      state.value[RealtimeCallMachineState.CALLING] ===
        RealtimeCallMachineState.CONNECTED ? (
        <div className="flex flex-col gap-4 items-center">
          <form className="flex gap-2" onSubmit={handleMessageSubmit}>
            <Input
              name="message"
              type="text"
              placeholder="Type your message..."
              className="w-64"
              autoComplete="off"
            />
            <Button
              type="submit"
              className="h-10.5 flex items-center justify-center"
            >
              Send
            </Button>
          </form>

          {/* MUTE */}
          <MuteToggleButton
            isMuted={state.context.muted}
            onToggle={muteToggle}
          />
        </div>
      ) : null}
    </div>
  );
}

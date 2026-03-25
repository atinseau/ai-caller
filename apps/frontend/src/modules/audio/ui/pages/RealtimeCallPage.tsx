import { Button } from "@/shared/components/ui/button";
import { useCompanies } from "@/shared/hooks/useCompanies";
import { MuteToggleButton } from "../components/MuteToggleButton";
import { useRealtimeCall } from "../hooks/useRealtimeCall";

export function RealtimeCallPage() {
  const { companies, isLoading } = useCompanies();

  const { start, stop, state, sendMessage, toggleMute } = useRealtimeCall();

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
      return;
    }

    start(companyId);
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

      {state.status === "idle" ? (
        <form className="flex gap-2" onSubmit={handleCompanyIdSubmit}>
          <input
            name="companyId"
            type="text"
            placeholder="enter company id..."
            className="border rounded px-3 py-2 w-64"
            autoComplete="off"
          />
          <Button
            type="submit"
            className="h-10.5 flex items-center justify-center"
          >
            Send
          </Button>
        </form>
      ) : null}

      {state.status === "connected" ? (
        <Button
          variant="destructive"
          className="h-10.5 flex items-center justify-center"
          onClick={stop}
        >
          End Call
        </Button>
      ) : null}

      <p>{state.status}</p>

      {state.status === "connected" ? (
        <div className="flex flex-col gap-4 items-center">
          <form className="flex gap-2" onSubmit={handleMessageSubmit}>
            <input
              name="message"
              type="text"
              placeholder="Type your message..."
              className="border rounded px-3 py-2 w-64"
              autoComplete="off"
            />
            <Button
              type="submit"
              className="h-10.5 flex items-center justify-center"
            >
              Send
            </Button>
          </form>

          <MuteToggleButton isMuted={state.muted} onToggle={toggleMute} />
        </div>
      ) : null}
    </div>
  );
}

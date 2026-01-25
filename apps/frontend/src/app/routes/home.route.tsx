import { Link } from "react-router";
import { authClient } from "@/infrastructure/auth";
import { Button } from "@/shared/components/ui/button";

export default function HomeRoute() {
  const { signIn } = authClient;
  const { data, isPending } = authClient.useSession();

  return (
    <div className="flex flex-col gap-4 w-fit">
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">Accueil</p>
        <p className="text-sm text-muted-foreground">
          Accède au dashboard, aux appels et au playground de dev.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/calls">Appels</Link>
        <Link to="/playground">Playground (dev)</Link>
        <Link to="/realtime-call">Realtime call (legacy)</Link>
      </div>

      {isPending && <p>Loading...</p>}

      {!isPending ? (
        <>
          {!data ? (
            <Button
              onClick={() =>
                signIn.social({
                  provider: "google",
                  callbackURL: window.location.origin,
                })
              }
            >
              Se connecter
            </Button>
          ) : (
            <pre>{JSON.stringify(data, null, 2)}</pre>
          )}
        </>
      ) : null}
    </div>
  );
}

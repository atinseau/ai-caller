import { Link } from "react-router";
import { authClient } from "@/infrastructure/auth";
import { Button } from "@/shared/components/ui/button";

export default function HomeRoute() {
  const { signIn } = authClient;
  const { data, isPending } = authClient.useSession();

  return (
    <div className="flex flex-col gap-2 w-fit">
      <p>salut</p>
      <Link to="/realtime-call">Go to realtime call</Link>

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
              signIn
            </Button>
          ) : (
            <pre>{JSON.stringify(data, null, 2)}</pre>
          )}
        </>
      ) : null}
    </div>
  );
}

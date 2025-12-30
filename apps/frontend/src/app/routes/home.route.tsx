import { authClient } from "@/infrastructure/auth";
import { Button } from "@/shared/components/ui/button";
import { Link } from "react-router";

export default function HomeRoute() {

  const { signIn } = authClient
  const { data, isPending } = authClient.useSession()

  return <div>
    <p>salut</p>
    <Link to="/audio">Go to audio</Link>

    {isPending && <p>Loading...</p>}

    {!isPending
      ? <>
        {!data
          ? <Button
            onClick={() => signIn.social({
              provider: "google",
              callbackURL: window.location.origin
            })}
          >
            signIn
          </Button>
          : <pre>
            {JSON.stringify(data, null, 2)}
          </pre>
        }
      </>
      : null
    }
  </div>
}

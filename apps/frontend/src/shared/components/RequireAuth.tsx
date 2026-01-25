import type { ReactNode } from "react";
import { authClient } from "@/infrastructure/auth";
import { Button } from "@/shared/components/ui/button";

type RequireAuthProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export function RequireAuth({
  children,
  title = "Accès réservé",
  description = "Connecte-toi pour accéder au dashboard.",
}: RequireAuthProps) {
  const { signIn } = authClient;
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Chargement de la session...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          onClick={() =>
            signIn.social({
              provider: "google",
              callbackURL: window.location.origin,
            })
          }
          className="w-fit"
        >
          Se connecter avec Google
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

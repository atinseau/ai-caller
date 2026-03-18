import { Clock, LogOut } from "lucide-react";
import { authClient } from "@/infrastructure/auth";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { Button } from "@/shared/components/ui/button";

export default function PendingAccessRoute() {
  const state = useCurrentUser();
  const name =
    state.status === "pending_access"
      ? state.session.name
      : state.status === "authenticated"
        ? state.user.name
        : null;

  async function handleLogout() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Clock className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            {name ? `Hello, ${name}` : "Access Pending"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account was created but hasn't been associated with a company
            yet. Please contact your administrator.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

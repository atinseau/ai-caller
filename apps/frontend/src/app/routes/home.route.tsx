import { Navigate } from "react-router";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";

export default function HomeRoute() {
  const state = useCurrentUser();

  if (state.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (state.status === "pending_access") {
    return <Navigate to="/pending-access" replace />;
  }

  if (state.user.role === UserRoleEnum.ROOT) {
    return <Navigate to="/dashboard/root" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

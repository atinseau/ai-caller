import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRoleEnum;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const state = useCurrentUser();

  if (state.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Loading..." />
      </div>
    );
  }

  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (state.status === "pending_access") {
    return <Navigate to="/pending-access" replace />;
  }

  if (requiredRole && state.user.role !== requiredRole) {
    return <Navigate to="/not-found" replace />;
  }

  return <>{children}</>;
}

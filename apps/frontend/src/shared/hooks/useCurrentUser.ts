import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/infrastructure/auth";
import type { UserRoleEnum } from "@/shared/enums/user-role.enum";
import type { ICurrentUser } from "@/shared/types/user.types";

export type CurrentUserState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "pending_access";
      session: { name: string; email: string; image?: string | null };
    }
  | { status: "authenticated"; user: ICurrentUser };

export function useCurrentUser(): CurrentUserState {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/user/me`,
        { credentials: "include" },
      );
      if (!res.ok) return null;
      return res.json() as Promise<{
        id: string;
        name: string;
        email: string;
        image: string | null;
        role: string;
        companyId: string | null;
      }>;
    },
    enabled: !!session,
    retry: false,
  });

  if (sessionLoading || (session && meLoading)) {
    return { status: "loading" };
  }

  if (!session) {
    return { status: "unauthenticated" };
  }

  if (!me || !me.role) {
    return {
      status: "pending_access",
      session: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    };
  }

  return {
    status: "authenticated",
    user: {
      id: me.id,
      name: me.name,
      email: me.email,
      image: me.image,
      role: me.role as UserRoleEnum,
      companyId: me.companyId,
    },
  };
}

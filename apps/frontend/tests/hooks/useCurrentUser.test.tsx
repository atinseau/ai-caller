import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { server } from "../msw/server";
import { createWrapper } from "../test-utils";

// Mock authClient so tests don't need a real better-auth session
vi.mock("@/infrastructure/auth", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

// Import after mock so vi.mocked() works correctly
import { authClient } from "@/infrastructure/auth";

const mockSession = (
  overrides?: Partial<{ isPending: boolean; data: unknown }>,
) =>
  vi.mocked(authClient.useSession).mockReturnValue({
    data: null,
    isPending: false,
    error: null,
    ...overrides,
  } as never);

const fakeSession = {
  user: { name: "Arthur", email: "arthur@test.local", image: null },
  session: { id: "s-1" },
};

describe("useCurrentUser", () => {
  beforeEach(() => {
    // Default: no session
    mockSession();
  });

  it("returns loading while session is pending", () => {
    mockSession({ isPending: true });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    expect(result.current.status).toBe("loading");
  });

  it("returns unauthenticated when there is no session", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    expect(result.current.status).toBe("unauthenticated");
  });

  it("returns loading while /me is fetching after session is set", () => {
    mockSession({ data: fakeSession });
    // /me will be slow — the default handler responds but we check the loading state first
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    // Immediately after render, me query hasn't resolved yet
    expect(result.current.status).toBe("loading");
  });

  it("returns authenticated with correct role when /me responds", async () => {
    mockSession({ data: fakeSession });

    server.use(
      http.get("*/api/v1/user/me", () =>
        HttpResponse.json({
          id: "user-root",
          name: "Arthur",
          email: "arthur@test.local",
          image: null,
          role: "ROOT",
          companyId: null,
        }),
      ),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    if (result.current.status === "authenticated") {
      expect(result.current.user.role).toBe("ROOT");
      expect(result.current.user.id).toBe("user-root");
    }
  });

  it("returns pending_access when /me returns 404 (user not in DB yet)", async () => {
    mockSession({ data: fakeSession });

    server.use(
      http.get("*/api/v1/user/me", () =>
        HttpResponse.json(null, { status: 404 }),
      ),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.status).not.toBe("loading"));

    expect(result.current.status).toBe("pending_access");
    if (result.current.status === "pending_access") {
      expect(result.current.session.email).toBe("arthur@test.local");
    }
  });

  it("returns pending_access when /me returns a user with no role", async () => {
    mockSession({ data: fakeSession });

    server.use(
      http.get("*/api/v1/user/me", () =>
        HttpResponse.json({
          id: "user-no-role",
          name: "New User",
          email: "new@test.local",
          image: null,
          role: null,
          companyId: null,
        }),
      ),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.status).not.toBe("loading"));
    expect(result.current.status).toBe("pending_access");
  });
});

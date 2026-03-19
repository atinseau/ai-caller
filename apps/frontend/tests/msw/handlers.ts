import { HttpResponse, http } from "msw";

/**
 * Default MSW handlers — match the real API routes.
 * Override per-test with `server.use(http.get(...))`.
 *
 * Use a wildcard prefix (e.g. "anything/api/v1/...") so VITE_API_URL origin doesn't matter.
 */
export const handlers = [
  http.get("*/api/v1/user/me", () =>
    HttpResponse.json({
      id: "default-user-id",
      name: "Default User",
      email: "default@test.local",
      image: null,
      role: "USER",
      companyId: null,
    }),
  ),

  http.get("*/api/v1/company/all", () => HttpResponse.json({ companies: [] })),

  http.get("*/api/v1/room/:roomId/events", () =>
    HttpResponse.json({ events: [] }),
  ),

  http.post("*/api/v1/room/create", () =>
    HttpResponse.json({
      data: { id: "room-test-id", modality: "TEXT", isTest: true },
    }),
  ),
];

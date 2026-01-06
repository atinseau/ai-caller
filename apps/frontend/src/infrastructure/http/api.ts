import type { paths } from "@ai-caller/api/openapi";
import createClient from "openapi-fetch";

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
});

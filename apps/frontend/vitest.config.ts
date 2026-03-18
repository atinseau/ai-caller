import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Separate vitest config — does NOT import vite.config.ts to avoid
 * the PORT env var requirement that would crash in CI / local test runs.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    env: {
      // Matches the default dev API URL — override in CI with env var
      VITE_API_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "tests/**",
        "src/app/routes.ts",
        "src/**/*.d.ts",
      ],
    },
  },
});

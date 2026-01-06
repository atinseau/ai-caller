import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : undefined;
if (!PORT) {
  throw new Error("PORT environment variable is not set or invalid");
}

export default defineConfig({
  ...(process.env.ENV === "production" && {
    resolve: {
      alias: {
        "react-dom/server": "react-dom/server.node",
      },
    },
  }),
  server: {
    port: PORT,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), devtoolsJson()],
});

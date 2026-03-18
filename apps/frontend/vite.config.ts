import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
if (!PORT) {
  throw new Error("PORT environment variable is not set or invalid");
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    ...(process.env.ENV === "production" && {
      alias: {
        "react-dom/server": "react-dom/server.node",
      },
    }),
  },
  server: {
    port: PORT,
  },
  plugins: [tailwindcss(), reactRouter(), devtoolsJson()],
});

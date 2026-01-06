import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { defineConfig, env } from "prisma/config";

expand(config());

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

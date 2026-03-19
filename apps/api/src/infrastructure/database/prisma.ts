import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "../config/env.ts";
import { logger } from "../logger/index.ts";

export const PRISMA_TOKEN = Symbol.for("PrismaClient");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: env.get("DATABASE_URL"),
  }),
});

try {
  await prisma.$connect();
  logger.info("Connected to the database successfully.");
} catch (error) {
  logger.error(error, "Error connecting to the database");
  process.exit(1);
}

export type { PrismaClient };
export { prisma };

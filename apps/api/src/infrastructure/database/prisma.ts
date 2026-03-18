import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "../config/env";
import { logger } from "../logger";

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

export { prisma };
export type { PrismaClient };

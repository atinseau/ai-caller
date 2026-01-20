import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../config/env";
import { prisma } from "../database/prisma";

export const auth = betterAuth({
  trustedOrigins: [env.get("CLIENT_URL")],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: env.get("GOOGLE_CLIENT_ID"),
      clientSecret: env.get("GOOGLE_CLIENT_SECRET"),
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
});

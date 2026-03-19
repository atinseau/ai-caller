import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../config/env.ts";
import { prisma } from "../database/prisma.ts";

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
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
        input: false,
      },
      companyId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // biome-ignore lint/suspicious/useAwait: required async by better-auth hook interface
        before: async (user) => {
          const role = user.email === env.get("ROOT_EMAIL") ? "ROOT" : "USER";
          return { data: { ...user, role } };
        },
      },
    },
  },
});

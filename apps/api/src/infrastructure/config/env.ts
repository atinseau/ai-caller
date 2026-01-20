import z from "zod";

const envDto = z.object({
  PORT: z.coerce.number(),
  CLIENT_URL: z.url(),
  DATABASE_URL: z.url({ protocol: /^postgres$/ }),
  OPENAI_API_KEY: z.string(),

  // GOOGLE
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // CONFIG
  ROOM_CALL_DURATION_MINUTE: z.coerce.number().positive(),
});

class Env {
  private env: z.infer<typeof envDto>;

  constructor() {
    this.env = this.parse(process.env);
  }

  get<T extends keyof z.infer<typeof envDto>>(key: T) {
    return this.env[key];
  }

  set<T extends keyof z.infer<typeof envDto>>(
    key: T,
    value: z.infer<typeof envDto>[T],
  ) {
    this.env = this.parse({
      ...this.env,
      [key]: value,
    });
  }

  private parse(data: unknown) {
    const result = envDto.safeParse(data);
    if (result.error) {
      throw new Error(z.prettifyError(result.error));
    }
    return result.data;
  }
}

export const env = new Env();

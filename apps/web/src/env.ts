import { z } from "zod";

const schema = z.object({
  STASHBOX_API_URL: z.string().min(1),
  STASHBOX_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing required env vars: ${missing}`);
  }
  return result.data;
}

import { parseEnv } from "./env.ts";

export const env = parseEnv(process.env as Record<string, string | undefined>);

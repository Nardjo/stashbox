import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

export interface Config {
  apiUrl: string;
  apiKey: string;
}

function configPath(dir?: string): string {
  return join(dir ?? join(homedir(), ".stashbox"), "config.json");
}

export async function loadConfig(configDir?: string): Promise<Config> {
  const raw = await readFile(configPath(configDir), "utf8").catch(() => "{}");
  const parsed = JSON.parse(raw) as Partial<Config>;

  if (!parsed.apiUrl || !parsed.apiKey) {
    throw new Error(
      "Missing config. Run: stashbox config set apiUrl <url> && stashbox config set apiKey <key>",
    );
  }

  return { apiUrl: parsed.apiUrl, apiKey: parsed.apiKey };
}

export async function setConfig(
  key: keyof Config,
  value: string,
  configDir?: string,
): Promise<void> {
  const path = configPath(configDir);
  const raw = await readFile(path, "utf8").catch(() => "{}");
  const parsed = JSON.parse(raw) as Partial<Config>;
  parsed[key] = value;
  await mkdir(join(configDir ?? join(homedir(), ".stashbox")), { recursive: true });
  await writeFile(path, JSON.stringify(parsed, null, 2));
}

export async function getConfig(
  key: keyof Config,
  configDir?: string,
): Promise<string | undefined> {
  const raw = await readFile(configPath(configDir), "utf8").catch(() => "{}");
  const parsed = JSON.parse(raw) as Partial<Config>;
  return parsed[key];
}

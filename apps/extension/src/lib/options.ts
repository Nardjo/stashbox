export interface Options {
  apiUrl: string;
  apiKey: string;
}

export async function getOptions(): Promise<Options> {
  const data = await chrome.storage.sync.get(["apiUrl", "apiKey"]);
  return {
    apiUrl: (data["apiUrl"] as string | undefined) ?? "",
    apiKey: (data["apiKey"] as string | undefined) ?? "",
  };
}

export async function saveOptions(options: Options): Promise<void> {
  await chrome.storage.sync.set(options);
}

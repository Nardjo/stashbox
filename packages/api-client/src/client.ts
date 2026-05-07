import type { Bookmark, BookmarkType, CreateBookmarkInput } from "@stashbox/shared";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ClientOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

export interface SearchParams {
  query: string;
  limit?: number;
  type?: BookmarkType;
  minScore?: number;
  tags?: string[];
}

export interface ListParams {
  limit?: number;
  offset?: number;
  type?: BookmarkType;
  tag?: string;
}

export interface AddParams extends CreateBookmarkInput {}

export interface Tag {
  tag: string;
  count: number;
}

export class StashboxClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetch: typeof globalThis.fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetch = (options.fetch ?? globalThis.fetch).bind(globalThis);
  }

  async search(params: SearchParams): Promise<Bookmark[]> {
    const res = await this.post<{ results: Bookmark[] }>("/search", params);
    return res.results;
  }

  async list(params: ListParams = {}): Promise<Bookmark[]> {
    const res = await this.getQuery<{ results: Bookmark[] }>(
      "/bookmarks",
      params as Record<string, unknown>,
    );
    return res.results;
  }

  async failed(params: ListParams = {}): Promise<Bookmark[]> {
    const res = await this.getQuery<{ results: Bookmark[] }>(
      "/bookmarks/failed",
      params as Record<string, unknown>,
    );
    return res.results;
  }

  async get(id: string): Promise<Bookmark> {
    const res = await this.request("GET", `/bookmarks/${id}`);
    return res.json() as Promise<Bookmark>;
  }

  async add(params: AddParams): Promise<Bookmark> {
    return this.post<Bookmark>("/bookmarks", params);
  }

  async delete(id: string): Promise<void> {
    await this.request("DELETE", `/bookmarks/${id}`);
  }

  async refresh(id: string): Promise<{ id: string }> {
    return this.post<{ id: string }>(`/bookmarks/${id}/refresh`, {});
  }

  async tags(minCount?: number): Promise<Tag[]> {
    const res = await this.getQuery<{ results: Tag[] }>("/tags", minCount ? { minCount } : {});
    return res.results;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await this.request("POST", path, body);
    return res.json() as Promise<T>;
  }

  private async getQuery<T>(path: string, query: Record<string, unknown> = {}): Promise<T> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.size ? `?${params}` : "";
    const res = await this.request("GET", `${path}${qs}`);
    return res.json() as Promise<T>;
  }

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const res = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as
        | { error?: string; message?: string }
        | Record<string, unknown>;
      const message =
        (data as { error?: string }).error ??
        (data as { message?: string }).message ??
        `HTTP ${res.status}`;
      throw new ApiError(message, res.status, data);
    }

    return res;
  }
}

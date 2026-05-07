import { StashboxClient } from "@stashbox/api-client";
import type { AddParams, ListParams, SearchParams } from "@stashbox/api-client";
import { createServerFn } from "@tanstack/react-start";
import { env } from "../config.ts";

type ClientOptions = {
  fetch?: typeof globalThis.fetch;
};

type ServerFnBuilderWithRuntimeHandler<TData, TResponse> = {
  handler: (
    extractedFn: undefined,
    serverFn: (ctx: { data: TData }) => Promise<TResponse>,
  ) => unknown;
};

type ServerFunction<TData, TResponse> = {
  (opts: { data: TData }): Promise<TResponse>;
  __executeServer(opts: {
    method: "GET" | "POST";
    data: TData;
    signal: AbortSignal;
  }): Promise<{ result: TResponse; error: unknown; context: unknown }>;
};

let client: StashboxClient | undefined;

export function getStashboxServerClient(options: ClientOptions = {}): StashboxClient {
  if (options.fetch) {
    return createClient(options.fetch);
  }

  client ??= createClient();
  return client;
}

function createClient(fetch?: typeof globalThis.fetch): StashboxClient {
  return new StashboxClient({
    baseUrl: env.STASHBOX_API_URL,
    apiKey: env.STASHBOX_API_KEY,
    fetch,
  });
}

function withServerHandler<TData, TResponse>(
  builder: { handler: unknown },
  serverFn: (ctx: { data: TData }) => Promise<TResponse>,
): ServerFunction<TData, TResponse> {
  return (builder.handler as ServerFnBuilderWithRuntimeHandler<TData, TResponse>["handler"])(
    undefined,
    serverFn,
  ) as ServerFunction<TData, TResponse>;
}

const listBookmarksBuilder = createServerFn({ method: "GET" })
  .validator((data: ListParams = {}) => data)
  .type("dynamic");

export const listBookmarks = withServerHandler<
  ListParams,
  Awaited<ReturnType<StashboxClient["list"]>>
>(listBookmarksBuilder, async ({ data }) => getStashboxServerClient().list(data));

const searchBookmarksBuilder = createServerFn({ method: "POST" })
  .validator((data: SearchParams) => data)
  .type("dynamic");

export const searchBookmarks = withServerHandler<
  SearchParams,
  Awaited<ReturnType<StashboxClient["search"]>>
>(searchBookmarksBuilder, async ({ data }) => getStashboxServerClient().search(data));

const addBookmarkBuilder = createServerFn({ method: "POST" })
  .validator((data: AddParams) => data)
  .type("dynamic");

export const addBookmark = withServerHandler<AddParams, Awaited<ReturnType<StashboxClient["add"]>>>(
  addBookmarkBuilder,
  async ({ data }) => getStashboxServerClient().add(data),
);

const deleteBookmarkBuilder = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .type("dynamic");

export const deleteBookmark = withServerHandler<
  { id: string },
  Awaited<ReturnType<StashboxClient["delete"]>>
>(deleteBookmarkBuilder, async ({ data }) => getStashboxServerClient().delete(data.id));

const listTagsBuilder = createServerFn({ method: "GET" }).type("dynamic");

export const listTags = withServerHandler<undefined, Awaited<ReturnType<StashboxClient["tags"]>>>(
  listTagsBuilder,
  async () => getStashboxServerClient().tags(),
);

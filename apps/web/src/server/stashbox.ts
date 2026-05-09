import type { AddParams, ListParams, SearchParams, Tag } from "@stashbox/api-client";
import { StashboxClient } from "@stashbox/api-client";
import type { Bookmark } from "@stashbox/shared";
import { createServerFn, serverOnly } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "../config.ts";

type ClientOptions = {
  fetch?: typeof globalThis.fetch;
};

const bookmarkTypeSchema = z.enum(["tweet", "youtube", "article", "image", "pdf", "other"]);

const listBookmarksSchema = z
  .object({
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
    type: bookmarkTypeSchema.optional(),
    tag: z.string().min(1).max(100).optional(),
  })
  .default({});

const searchBookmarksSchema = z.object({
  query: z.string().min(1).max(1_000),
  limit: z.number().int().positive().max(100).optional(),
  type: bookmarkTypeSchema.optional(),
  minScore: z.number().min(0).max(1).optional(),
  tags: z.array(z.string().min(1).max(100)).max(20).optional(),
});

const addBookmarkSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "URL must use http or https",
    }),
  content: z.string().max(200_000).optional(),
});

const deleteBookmarkSchema = z.object({
  id: z.string().uuid(),
});

const initialBookmarksPage = { limit: 48, offset: 0 } satisfies ListParams;

let client: StashboxClient | undefined;

export const getStashboxServerClient = serverOnly((options: ClientOptions = {}): StashboxClient => {
  if (options.fetch) {
    return createClient(options.fetch);
  }

  client ??= createClient();
  return client;
});

export const createStashboxServerOperations = serverOnly((client = getStashboxServerClient()) => {
  return {
    listBookmarks: async (params: ListParams = {}) =>
      client.list(listBookmarksSchema.parse(params)),
    searchBookmarks: async (params: SearchParams) =>
      client.search(searchBookmarksSchema.parse(params)),
    addBookmark: async (params: AddParams) => client.add(addBookmarkSchema.parse(params)),
    deleteBookmark: async ({ id }: { id: string }) =>
      client.delete(deleteBookmarkSchema.parse({ id }).id),
    listTags: async () => client.tags(),
  };
});

function createClient(fetch?: typeof globalThis.fetch): StashboxClient {
  return new StashboxClient({
    baseUrl: env.STASHBOX_API_URL,
    apiKey: env.STASHBOX_API_KEY,
    fetch,
  });
}

export const listBookmarks = createServerFn({ method: "GET" })
  .validator((data: ListParams = {}) => listBookmarksSchema.parse(data))
  .type("dynamic")
  .handler(
    async ({ data }): Promise<unknown> => createStashboxServerOperations().listBookmarks(data),
  );

export const searchBookmarks = createServerFn({ method: "POST" })
  .validator((data: SearchParams) => searchBookmarksSchema.parse(data))
  .type("dynamic")
  .handler(
    async ({ data }): Promise<unknown> => createStashboxServerOperations().searchBookmarks(data),
  );

export const addBookmark = createServerFn({ method: "POST" })
  .validator((data: AddParams) => addBookmarkSchema.parse(data))
  .type("dynamic")
  .handler(
    async ({ data }): Promise<unknown> => createStashboxServerOperations().addBookmark(data),
  );

export const deleteBookmark = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => deleteBookmarkSchema.parse(data))
  .type("dynamic")
  .handler(async ({ data }) => createStashboxServerOperations().deleteBookmark(data));

export const listTags = createServerFn({ method: "GET" })
  .type("dynamic")
  .handler(async () => createStashboxServerOperations().listTags());

export type InitialBrowseData = {
  bookmarks: Bookmark[];
  tags: Tag[];
};

export async function loadInitialBrowseData(): Promise<InitialBrowseData> {
  const operations = createStashboxServerOperations();
  const bookmarks = await operations.listBookmarks(initialBookmarksPage);
  const tags = await operations.listTags();

  return { bookmarks, tags };
}

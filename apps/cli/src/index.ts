import { defineCommand, runMain } from "citty";
import { StashitClient } from "@stashit/api-client";
import { loadConfig, setConfig, getConfig } from "./config.js";
import { runSearch } from "./commands/search.js";
import { runList } from "./commands/list.js";
import { runGet } from "./commands/get.js";
import { runAdd } from "./commands/add.js";
import { runDelete } from "./commands/delete.js";
import { runRefresh } from "./commands/refresh.js";
import { runFailed } from "./commands/failed.js";
import { runTags } from "./commands/tags.js";

const print = (line: string) => console.log(line);

async function withClient<T>(fn: (client: StashitClient) => Promise<T>): Promise<T> {
  const config = await loadConfig();
  const client = new StashitClient({ baseUrl: config.apiUrl, apiKey: config.apiKey });
  return fn(client);
}

const searchCmd = defineCommand({
  meta: { description: "Semantic search across your bookmarks" },
  args: {
    query: { type: "positional", description: "Search query" },
    json: { type: "boolean", default: false, description: "Output raw JSON" },
    limit: { type: "string", description: "Max results" },
    type: { type: "string", description: "Filter by type (article, tweet, youtube, ...)" },
    "min-score": { type: "string", description: "Minimum similarity score (0-1)" },
  },
  run: ({ args }) =>
    withClient((client) =>
      runSearch({
        query: args.query,
        json: args.json,
        client,
        print,
        ...(args.limit ? { limit: Number(args.limit) } : {}),
        ...(args.type ? { type: args.type as never } : {}),
        ...(args["min-score"] ? { minScore: Number(args["min-score"]) } : {}),
      }),
    ),
});

const recentCmd = defineCommand({
  meta: { description: "List recent bookmarks" },
  args: {
    json: { type: "boolean", default: false },
    limit: { type: "string", description: "Max results" },
    type: { type: "string" },
    tag: { type: "string" },
  },
  run: ({ args }) =>
    withClient((client) =>
      runList({
        json: args.json,
        client,
        print,
        ...(args.limit ? { limit: Number(args.limit) } : {}),
        ...(args.type ? { type: args.type as never } : {}),
        ...(args.tag ? { tag: args.tag } : {}),
      }),
    ),
});

const getCmd = defineCommand({
  meta: { description: "Get a bookmark by ID" },
  args: {
    id: { type: "positional", description: "Bookmark ID" },
    json: { type: "boolean", default: false },
  },
  run: ({ args }) =>
    withClient((client) => runGet({ id: args.id, json: args.json, client, print })),
});

const addCmd = defineCommand({
  meta: { description: "Save a new bookmark" },
  args: {
    url: { type: "positional", description: "URL to save" },
    content: { type: "string", description: "Page content (bypasses fetch provider)" },
    json: { type: "boolean", default: false },
  },
  run: ({ args }) =>
    withClient((client) =>
      runAdd({
        url: args.url,
        json: args.json,
        client,
        print,
        ...(args.content ? { content: args.content } : {}),
      }),
    ),
});

const deleteCmd = defineCommand({
  meta: { description: "Delete a bookmark" },
  args: {
    id: { type: "positional", description: "Bookmark ID" },
    json: { type: "boolean", default: false },
  },
  run: ({ args }) =>
    withClient((client) => runDelete({ id: args.id, json: args.json, client, print })),
});

const refreshCmd = defineCommand({
  meta: { description: "Re-enrich a bookmark" },
  args: {
    id: { type: "positional", description: "Bookmark ID" },
    json: { type: "boolean", default: false },
  },
  run: ({ args }) =>
    withClient((client) => runRefresh({ id: args.id, json: args.json, client, print })),
});

const failedCmd = defineCommand({
  meta: { description: "List failed bookmarks" },
  args: {
    json: { type: "boolean", default: false },
    limit: { type: "string" },
  },
  run: ({ args }) =>
    withClient((client) =>
      runFailed({
        json: args.json,
        client,
        print,
        ...(args.limit ? { limit: Number(args.limit) } : {}),
      }),
    ),
});

const tagsCmd = defineCommand({
  meta: { description: "List all tags" },
  args: {
    json: { type: "boolean", default: false },
    "min-count": { type: "string", description: "Minimum bookmark count" },
  },
  run: ({ args }) =>
    withClient((client) =>
      runTags({
        json: args.json,
        client,
        print,
        ...(args["min-count"] ? { minCount: Number(args["min-count"]) } : {}),
      }),
    ),
});

const configCmd = defineCommand({
  meta: { description: "Manage local config (~/.stashit/config.json)" },
  subCommands: {
    set: defineCommand({
      meta: { description: "Set a config value" },
      args: {
        key: { type: "positional", description: "apiUrl or apiKey" },
        value: { type: "positional", description: "Value to set" },
      },
      run: async ({ args }) => {
        await setConfig(args.key as never, String(args.value));
        console.log(`✓ Set ${args.key}`);
      },
    }),
    get: defineCommand({
      meta: { description: "Get a config value" },
      args: {
        key: { type: "positional", description: "apiUrl or apiKey" },
      },
      run: async ({ args }) => {
        const val = await getConfig(args.key as never);
        console.log(val ?? "(not set)");
      },
    }),
  },
});

const main = defineCommand({
  meta: {
    name: "stashit",
    version: "0.1.0",
    description: "Save and search bookmarks from the terminal",
  },
  subCommands: {
    search: searchCmd,
    recent: recentCmd,
    get: getCmd,
    add: addCmd,
    delete: deleteCmd,
    refresh: refreshCmd,
    failed: failedCmd,
    tags: tagsCmd,
    config: configCmd,
  },
});

runMain(main);

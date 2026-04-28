import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StashitClient } from "@stashit/api-client";
import { createServer } from "./server.js";

const apiUrl = process.env["STASHIT_API_URL"];
const apiKey = process.env["STASHIT_API_KEY"];

if (!apiUrl || !apiKey) {
  console.error("Error: STASHIT_API_URL and STASHIT_API_KEY environment variables are required");
  process.exit(1);
}

const client = new StashitClient({ baseUrl: apiUrl, apiKey });
const server = createServer(client);

await server.connect(new StdioServerTransport());

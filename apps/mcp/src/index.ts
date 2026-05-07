import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StashboxClient } from "@stashbox/api-client";
import { createServer } from "./server.js";

const apiUrl = process.env["STASHBOX_API_URL"];
const apiKey = process.env["STASHBOX_API_KEY"];

if (!apiUrl || !apiKey) {
  console.error("Error: STASHBOX_API_URL and STASHBOX_API_KEY environment variables are required");
  process.exit(1);
}

const client = new StashboxClient({ baseUrl: apiUrl, apiKey });
const server = createServer(client);

await server.connect(new StdioServerTransport());

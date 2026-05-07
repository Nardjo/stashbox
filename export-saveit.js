const TOKEN = require("fs")
  .readFileSync(
    require("path").join(require("os").homedir(), ".config/tokens/saveit-cli.txt"),
    "utf8",
  )
  .trim();
const BASE_URL = "https://saveit.now/api/v1";

async function fetchAllBookmarks() {
  const bookmarks = [];
  let cursor = null;
  let hasMore = true;

  let prevCursor = null;

  while (hasMore) {
    const url = new URL(`${BASE_URL}/bookmarks`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      process.exit(1);
    }

    const data = await res.json();
    bookmarks.push(...data.bookmarks);
    hasMore = data.hasMore && data.nextCursor && data.nextCursor !== prevCursor;
    prevCursor = cursor;
    cursor = data.nextCursor;

    console.error(`Fetched ${bookmarks.length} bookmarks...`);
  }

  return bookmarks;
}

function mapType(saveitType) {
  const map = {
    ARTICLE: "article",
    VIDEO: "youtube",
    IMAGE: "image",
    AUDIO: "other",
    PDF: "pdf",
    DOCUMENT: "article",
    PAGE: "article",
    OTHER: "other",
  };
  return map[saveitType] || "other";
}

function mapStatus(saveitStatus) {
  if (saveitStatus === "DONE") return "done";
  if (saveitStatus === "ERROR") return "failed";
  return "pending";
}

function escapeCsv(value) {
  if (value == null) return "";
  const str = String(value).replace(/"/g, '""');
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

async function main() {
  const bookmarks = await fetchAllBookmarks();
  console.error(`Total bookmarks: ${bookmarks.length}`);

  const fs = require("fs");
  const outputPath = "/tmp/saveit-export.csv";
  let output = "";

  // CSV header for stashbox import
  const headers = ["url", "title", "description", "tags", "type", "enrichment_status", "saved_at"];
  output += headers.join(",") + "\n";

  for (const b of bookmarks) {
    const row = [
      escapeCsv(b.url),
      escapeCsv(b.title || b.url),
      escapeCsv(b.summary || b.ogDescription || ""),
      escapeCsv(""), // saveit doesn't seem to have tags in this API
      escapeCsv(mapType(b.type)),
      escapeCsv(mapStatus(b.status)),
      escapeCsv(b.createdAt),
    ];
    output += row.join(",") + "\n";
  }

  fs.writeFileSync(outputPath, output);
  console.error(`Wrote ${bookmarks.length} bookmarks to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

# StashIt — Apple Shortcut

iOS share-sheet client for StashIt. Share any URL from Safari, Twitter, YouTube, etc., and it lands as a bookmark in 1 second.

## Install

> The pre-built `.shortcut` binary and the iCloud share link are not yet published. Until they are, build it manually with the steps below — it takes ~2 minutes.

### One-tap install (when available)

1. Open the iCloud share link from your iPhone (link will be added to the repo root README once published).
2. Tap **Add Shortcut**.
3. On first run, Shortcuts will ask for the API base URL and your API key.

### Manual build

The Shortcut is a small chain of actions. Build it once in the **Shortcuts** app, then run from any share sheet.

#### 1. Create the input variables

Open **Shortcuts** → **+** (new shortcut) → tap the settings icon → **Set up shortcut input**:

- **Accept**: URLs only
- **In share sheet**: ON
- **Share sheet types**: URLs

Then add two text variables (Actions panel → search "Text"):

- `StashIt API URL` → e.g. `https://api.stashit.example.com`
- `StashIt API Key` → your API key (the plaintext returned by `node ace key:create <name>`)

You can also store these as **shortcut input variables** so you only set them once and they persist across runs.

#### 2. Get the article body (optional, recommended)

Add **Get Article Using Safari Reader** with input set to **Shortcut Input**.

If Safari Reader fails (e.g. for Twitter or YouTube links), the Shortcut should still POST the URL alone — the API enriches server-side. Wrap the Reader call in an **If** block on `Shortcut Input` so unsupported URLs skip it.

#### 3. POST to /bookmarks

Add **Get Contents of URL**:

- **URL**: `[StashIt API URL]/bookmarks`
- **Method**: `POST`
- **Headers**:
  - `Authorization` → `Bearer [StashIt API Key]`
  - `Content-Type` → `application/json`
- **Request Body**: JSON
  - `url` → Shortcut Input
  - `title` → Article Name (from Safari Reader, optional)
  - `content` → Article Body (from Safari Reader, optional)
  - `sharedFrom` → `ios-shortcut`

#### 4. Branch on the response status

Use **Get Dictionary Value** to read the HTTP status from the previous action (or use **If** on the response body).

- **201** → **Show Notification**: "Saved to StashIt"
- **409** → **Show Notification**: "Already saved"
- anything else → **Show Notification**: "StashIt error: [status]"

#### 5. Name and pin

Name the Shortcut `StashIt`. Optionally pin it to the top of the share sheet under **Shortcuts settings → Share sheet**.

## Payload reference

The Shortcut sends this body to `POST /bookmarks`:

```json
{
  "url": "https://example.com/article",
  "title": "Optional article title",
  "content": "Optional Safari Reader text",
  "sharedFrom": "ios-shortcut"
}
```

Required: `url`. The rest is optional. `sharedFrom` must be one of: `ios-shortcut`, `chrome-extension`, `firefox-extension`, `cli`, `mcp`, `import-csv`, `api`.

## Server responses

| Status | Meaning                        | Shortcut behavior        |
| ------ | ------------------------------ | ------------------------ |
| 201    | New bookmark created           | "Saved to StashIt"       |
| 409    | URL already saved (deduped)    | "Already saved"          |
| 401    | Missing or invalid API key     | "Auth error — check key" |
| 422    | Bad payload (e.g. invalid URL) | "Invalid URL"            |
| 5xx    | Server error                   | "StashIt error — retry"  |

## Troubleshooting

- **"Auth error"** — regenerate the key with `node ace key:create <name>` and update the `StashIt API Key` variable.
- **YouTube / Twitter share doesn't include URL text** — the share sheet sometimes passes the link as plain text. Make sure the Shortcut accepts both **URLs** and **Text** in its input settings, then coerce text to URL in the first step.
- **Safari Reader fails on unsupported pages** — wrap the Reader action in an `If` block; on failure, POST without `title`/`content` and let the server enrich.

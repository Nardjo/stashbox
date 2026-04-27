import { z } from "zod";

export const BookmarkTypeSchema = z.enum(["tweet", "youtube", "article", "image", "pdf", "other"]);
export type BookmarkType = z.infer<typeof BookmarkTypeSchema>;

export const EnrichmentStatusSchema = z.enum([
  "pending",
  "enriching",
  "done",
  "degraded",
  "failed",
]);
export type EnrichmentStatus = z.infer<typeof EnrichmentStatusSchema>;

export const EnrichmentFailureReasonSchema = z.enum([
  "url_dead",
  "fetch_unavailable",
  "llm_invalid_output",
  "llm_provider_error",
  "embedding_provider_error",
  "unknown",
]);
export type EnrichmentFailureReason = z.infer<typeof EnrichmentFailureReasonSchema>;

export const SavedFromSchema = z.enum([
  "ios-shortcut",
  "chrome-extension",
  "firefox-extension",
  "cli",
  "mcp",
  "import-csv",
  "api",
]);
export type SavedFrom = z.infer<typeof SavedFromSchema>;

const IsoDate = z.string().datetime();
const UrlHash = z.string().regex(/^[0-9a-f]{64}$/, "must be 64-char lowercase hex");

export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  urlHash: UrlHash,
  type: BookmarkTypeSchema,
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  embedding: z.array(z.number()).nullable(),
  ogImage: z.string().url().nullable(),
  embedData: z.unknown().nullable(),
  enrichmentStatus: EnrichmentStatusSchema,
  enrichmentError: z.string().nullable(),
  enrichmentFailureReason: EnrichmentFailureReasonSchema.nullable(),
  enrichmentAttempts: z.number().int().nonnegative(),
  enrichedAt: IsoDate.nullable(),
  embeddingSourceText: z.string().nullable(),
  savedAt: IsoDate,
  savedCount: z.number().int().positive(),
  lastSavedAt: IsoDate,
  savedFrom: z.array(SavedFromSchema),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

export const CreateBookmarkInputSchema = z.object({
  url: z.string().url(),
  content: z.string().optional(),
});
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>;

export const SearchInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
  type: BookmarkTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  min_score: z.number().min(0).max(1).default(0.4),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

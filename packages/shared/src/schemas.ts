import { z } from "zod";

export const BookmarkTypeSchema = z.enum(["tweet", "youtube", "article", "image", "pdf", "other"]);
export type BookmarkType = z.infer<typeof BookmarkTypeSchema>;

export const MediaKindSchema = z.enum(["audio", "video"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const MediaProviderSchema = z.enum(["youtube", "vimeo", "soundcloud", "spotify"]);
export type MediaProvider = z.infer<typeof MediaProviderSchema>;

export const EnrichmentStatusSchema = z.enum([
  "pending",
  "enriching",
  "done",
  "degraded",
  "failed",
]);
export type EnrichmentStatus = z.infer<typeof EnrichmentStatusSchema>;

export const TranscriptionStatusSchema = z.enum([
  "none",
  "pending",
  "transcribing",
  "done",
  "failed",
]);
export type TranscriptionStatus = z.infer<typeof TranscriptionStatusSchema>;

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

export const ClientCaptureInputSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type ClientCaptureInput = z.infer<typeof ClientCaptureInputSchema>;

export const CaptureSchema = z.object({
  url: z.string().url(),
  source: z.enum(["client", "server"]),
  mimeType: z.literal("image/png"),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  byteSize: z.number().int().positive(),
  capturedAt: IsoDate,
});
export type Capture = z.infer<typeof CaptureSchema>;

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
  capture: CaptureSchema.nullable().optional(),
  embedData: z.unknown().nullable(),
  isMedia: z.boolean().optional(),
  mediaKind: MediaKindSchema.nullable().optional(),
  mediaProvider: MediaProviderSchema.nullable().optional(),
  enrichmentStatus: EnrichmentStatusSchema,
  enrichmentError: z.string().nullable(),
  enrichmentFailureReason: EnrichmentFailureReasonSchema.nullable(),
  enrichmentAttempts: z.number().int().nonnegative(),
  enrichedAt: IsoDate.nullable(),
  embeddingSourceText: z.string().nullable(),
  transcriptionStatus: TranscriptionStatusSchema.optional(),
  transcriptionError: z.string().nullable().optional(),
  transcriptionText: z.string().nullable().optional(),
  transcribedAt: IsoDate.nullable().optional(),
  savedAt: IsoDate,
  savedCount: z.number().int().positive(),
  lastSavedAt: IsoDate,
  savedFrom: z.array(SavedFromSchema),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

export const CreateBookmarkInputSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  content: z.string().optional(),
  sharedFrom: SavedFromSchema.optional(),
  capture: ClientCaptureInputSchema.optional(),
});
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>;

export const SiteCredentialCookieSameSiteSchema = z.enum([
  "no_restriction",
  "lax",
  "strict",
  "unspecified",
]);
export type SiteCredentialCookieSameSite = z.infer<typeof SiteCredentialCookieSameSiteSchema>;

export const SiteCredentialCookieSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  domain: z.string().min(1),
  path: z.string().min(1),
  secure: z.boolean(),
  httpOnly: z.boolean(),
  sameSite: SiteCredentialCookieSameSiteSchema.nullable(),
  expirationDate: z.number().positive().nullable(),
  session: z.boolean(),
  hostOnly: z.boolean(),
});
export type SiteCredentialCookie = z.infer<typeof SiteCredentialCookieSchema>;

export const SyncSiteCredentialsInputSchema = z.object({
  domain: z.string().min(1),
  cookies: z.array(SiteCredentialCookieSchema).max(500),
});
export type SyncSiteCredentialsInput = z.infer<typeof SyncSiteCredentialsInputSchema>;

export const SiteCredentialMetadataSchema = z.object({
  id: z.string().uuid(),
  domain: z.string().min(1),
  cookieCount: z.number().int().nonnegative(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type SiteCredentialMetadata = z.infer<typeof SiteCredentialMetadataSchema>;

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

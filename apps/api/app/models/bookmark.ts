import { BaseModel, column } from '@adonisjs/lucid/orm'
import type {
  BookmarkType,
  EnrichmentFailureReason,
  EnrichmentStatus,
  MediaKind,
  MediaProvider,
  SavedFrom,
  TranscriptionStatus,
} from '@stashbox/shared'
import { DateTime } from 'luxon'

export default class Bookmark extends BaseModel {
  static table = 'bookmarks'
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare url: string

  @column()
  declare urlHash: string

  @column()
  declare type: BookmarkType

  @column()
  declare title: string

  @column()
  declare description: string

  @column({
    prepare: (v: string[] | null) => JSON.stringify(v ?? []),
    consume: (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : (v ?? [])),
  })
  declare tags: string[]

  @column()
  declare ogImage: string | null

  @column()
  declare capturePath: string | null

  @column()
  declare captureUrl: string | null

  @column()
  declare captureSource: 'client' | 'server' | null

  @column()
  declare captureMimeType: 'image/png' | null

  @column()
  declare captureWidth: number | null

  @column()
  declare captureHeight: number | null

  @column()
  declare captureByteSize: number | null

  @column.dateTime()
  declare capturedAt: DateTime | null

  @column({
    prepare: (v: unknown) => (v === null || v === undefined ? null : JSON.stringify(v)),
    consume: (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare embedData: unknown | null

  @column()
  declare isMedia: boolean

  @column()
  declare mediaKind: MediaKind | null

  @column()
  declare mediaProvider: MediaProvider | null

  @column()
  declare enrichmentStatus: EnrichmentStatus

  @column()
  declare enrichmentError: string | null

  @column()
  declare enrichmentFailureReason: EnrichmentFailureReason | null

  @column()
  declare enrichmentAttempts: number

  @column.dateTime()
  declare enrichedAt: DateTime | null

  @column()
  declare embeddingSourceText: string | null

  @column()
  declare transcriptionStatus: TranscriptionStatus

  @column()
  declare transcriptionError: string | null

  @column()
  declare transcriptionText: string | null

  @column.dateTime()
  declare transcribedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare savedAt: DateTime

  @column()
  declare savedCount: number

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare lastSavedAt: DateTime

  @column({
    prepare: (v: SavedFrom[] | null) => JSON.stringify(v ?? []),
    consume: (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : (v ?? [])),
  })
  declare savedFrom: SavedFrom[]
}

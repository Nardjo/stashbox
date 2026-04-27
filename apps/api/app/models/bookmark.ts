import { BaseModel, column } from '@adonisjs/lucid/orm'
import type {
  BookmarkType,
  EnrichmentFailureReason,
  EnrichmentStatus,
  SavedFrom,
} from '@stashit/shared'
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

  @column({
    prepare: (v: unknown) => (v === null || v === undefined ? null : JSON.stringify(v)),
    consume: (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare embedData: unknown | null

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

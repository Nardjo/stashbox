import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookmarks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_media').notNullable().defaultTo(false)
      table.string('media_kind', 16).nullable()
      table.string('media_provider', 32).nullable()
      table.string('transcription_status', 16).notNullable().defaultTo('none')
      table.text('transcription_error').nullable()
      table.text('transcription_text').nullable()
      table.timestamp('transcribed_at', { useTz: true }).nullable()
    })

    this.schema.raw(
      `ALTER TABLE ${this.tableName}
       ADD CONSTRAINT bookmarks_transcription_status_check
       CHECK (transcription_status IN ('none', 'pending', 'transcribing', 'done', 'failed'))`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName}
       DROP CONSTRAINT IF EXISTS bookmarks_transcription_status_check`
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('transcribed_at')
      table.dropColumn('transcription_text')
      table.dropColumn('transcription_error')
      table.dropColumn('transcription_status')
      table.dropColumn('media_provider')
      table.dropColumn('media_kind')
      table.dropColumn('is_media')
    })
  }
}

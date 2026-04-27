import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookmarks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.text('url').notNullable()
      table.string('url_hash', 64).notNullable().unique()
      table.string('type', 16).notNullable().defaultTo('other')
      table.text('title').notNullable().defaultTo('')
      table.text('description').notNullable().defaultTo('')
      table.jsonb('tags').notNullable().defaultTo(this.raw(`'[]'::jsonb`))
      table.text('og_image').nullable()
      table.jsonb('embed_data').nullable()

      table.string('enrichment_status', 16).notNullable().defaultTo('pending')
      table.text('enrichment_error').nullable()
      table.string('enrichment_failure_reason', 32).nullable()
      table.integer('enrichment_attempts').notNullable().defaultTo(0)
      table.timestamp('enriched_at', { useTz: true }).nullable()
      table.text('embedding_source_text').nullable()

      table.timestamp('saved_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.integer('saved_count').notNullable().defaultTo(1)
      table.timestamp('last_saved_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.jsonb('saved_from').notNullable().defaultTo(this.raw(`'[]'::jsonb`))
    })

    this.schema.raw('ALTER TABLE bookmarks ADD COLUMN embedding vector(1536)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

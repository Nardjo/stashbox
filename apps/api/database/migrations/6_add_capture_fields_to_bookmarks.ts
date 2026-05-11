import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookmarks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('capture_path').nullable()
      table.text('capture_url').nullable()
      table.string('capture_source', 16).nullable()
      table.string('capture_mime_type', 64).nullable()
      table.integer('capture_width').nullable()
      table.integer('capture_height').nullable()
      table.integer('capture_byte_size').nullable()
      table.timestamp('captured_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('captured_at')
      table.dropColumn('capture_byte_size')
      table.dropColumn('capture_height')
      table.dropColumn('capture_width')
      table.dropColumn('capture_mime_type')
      table.dropColumn('capture_source')
      table.dropColumn('capture_url')
      table.dropColumn('capture_path')
    })
  }
}

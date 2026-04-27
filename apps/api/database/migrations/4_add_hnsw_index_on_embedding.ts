import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(
      `CREATE INDEX bookmarks_embedding_hnsw_idx
       ON bookmarks USING hnsw (embedding vector_cosine_ops)`
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS bookmarks_embedding_hnsw_idx')
  }
}

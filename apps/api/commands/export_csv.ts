import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { stringify as csvStringify } from 'csv-stringify'

const COLUMNS = [
  'url',
  'title',
  'description',
  'tags',
  'created_at',
  'type',
  'enrichment_status',
] as const

export default class ExportCsv extends BaseCommand {
  static commandName = 'export:csv'
  static description = 'Stream every bookmark (including failed) into a CSV file.'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Destination file path' })
  declare path: string

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const query = db
      .from('bookmarks')
      .select('url', 'title', 'description', 'tags', 'saved_at', 'type', 'enrichment_status')
      .orderBy('saved_at', 'asc')

    const stringifier = csvStringify({ header: true, columns: [...COLUMNS] })
    const out = createWriteStream(this.path)

    const source = Readable.from(toRowIterable(query))

    let count = 0
    source.on('data', () => count++)

    await pipeline(source, stringifier, out)

    this.logger.info(`Export complete — wrote ${count} bookmarks to ${this.path}`)
  }
}

async function* toRowIterable(
  query: ReturnType<typeof import('@adonisjs/lucid/services/db').default.from>
): AsyncIterable<Record<string, string>> {
  const stream = query.knexQuery.stream()
  for await (const row of stream as AsyncIterable<Record<string, unknown>>) {
    yield {
      url: String(row.url ?? ''),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      tags: serializeTags(row.tags),
      created_at:
        row.saved_at instanceof Date ? row.saved_at.toISOString() : String(row.saved_at ?? ''),
      type: String(row.type ?? ''),
      enrichment_status: String(row.enrichment_status ?? ''),
    }
  }
}

function serializeTags(v: unknown): string {
  let arr: string[] = []
  if (Array.isArray(v)) arr = v as string[]
  else if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) arr = parsed
    } catch {
      // ignore
    }
  }
  return arr.join('|')
}

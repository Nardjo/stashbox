import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ace from '@adonisjs/core/services/ace'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import nock from 'nock'

import Bookmark from '#models/bookmark'
import EmbeddingProvider from '#services/embedding_provider'
import enrichmentQueue from '#services/enrichment_queue'
import LlmProvider from '#services/llm_provider'
import { mockEmbeddingReturning } from '#tests/helpers/mock_embedding'
import { mockModelReturning } from '#tests/helpers/mock_llm'

import ExportCsv from '../../commands/export_csv.js'
import ImportCsv from '../../commands/import_csv.js'

async function tmpFile(name: string, content = ''): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'stashit-csv-'))
  const path = join(dir, name)
  if (content) await writeFile(path, content, 'utf8')
  return path
}

function installEnrichmentMocks() {
  app.container.swap(
    LlmProvider,
    () =>
      ({
        getModel: async () =>
          mockModelReturning({
            title: 'Enriched',
            description: 'Enriched body.',
            tags: ['enriched'],
            type: 'other',
          }),
      }) as unknown as LlmProvider
  )
  app.container.swap(
    EmbeddingProvider,
    () =>
      ({
        getModel: async () => mockEmbeddingReturning(new Array(1536).fill(0.01)),
      }) as unknown as EmbeddingProvider
  )
}

function logsOf(command: { logger: { getLogs: () => Array<{ message: string }> } }): string {
  return command.logger
    .getLogs()
    .map((l) => l.message)
    .join('\n')
}

test.group('ace import:csv', (group) => {
  group.setup(async () => {
    await ace.boot()
  })

  group.each.setup(() => {
    installEnrichmentMocks()
    nock.disableNetConnect()
    nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'))
    // Stub Jina Reader for any URL the CSV imports
    nock('https://r.jina.ai').get(/.*/).reply(200, 'mock content body. '.repeat(20)).persist()
  })
  group.each.teardown(() => {
    app.container.restoreAll()
    nock.cleanAll()
    nock.enableNetConnect()
  })

  test('inserts a valid row and dispatches enrichment', async ({ assert }) => {
    const path = await tmpFile(
      'in.csv',
      'url,title,description,tags,created_at\nhttps://example.com/a,Hello,Desc,dev|cli,\n'
    )

    const command = await ace.create(ImportCsv, [path])
    command.ui.switchMode('raw')
    await command.exec()
    await enrichmentQueue.flush()

    assert.equal(command.exitCode, 0)
    const row = await Bookmark.findByOrFail('url', 'https://example.com/a')
    assert.exists(row.id)
    assert.match(logsOf(command), /inserted[^\n]*1/i)
  })

  test('skips duplicate urls', async ({ assert }) => {
    const path = await tmpFile('dup.csv', 'url\nhttps://example.com/dup\nhttps://example.com/dup\n')

    const command = await ace.create(ImportCsv, [path])
    command.ui.switchMode('raw')
    await command.exec()
    await enrichmentQueue.flush()

    assert.equal(command.exitCode, 0)
    const rows = await Bookmark.query().where('url', 'https://example.com/dup')
    assert.lengthOf(rows, 1)
    assert.match(logsOf(command), /skipped[^\n]*1/i)
  })

  test('counts invalid rows as failed', async ({ assert }) => {
    const path = await tmpFile('bad.csv', 'url\nnot-a-url\nhttps://example.com/ok\n')

    const command = await ace.create(ImportCsv, [path])
    command.ui.switchMode('raw')
    await command.exec()
    await enrichmentQueue.flush()

    const rows = await Bookmark.all()
    assert.lengthOf(rows, 1)
    assert.match(logsOf(command), /failed[^\n]*1/i)
  })

  test('honors created_at as savedAt for new rows', async ({ assert }) => {
    const iso = '2024-01-15T10:00:00.000Z'
    const path = await tmpFile('created.csv', `url,created_at\nhttps://example.com/t,${iso}\n`)
    const command = await ace.create(ImportCsv, [path])
    command.ui.switchMode('raw')
    await command.exec()
    await enrichmentQueue.flush()

    const row = await Bookmark.findByOrFail('url', 'https://example.com/t')
    assert.equal(row.savedAt.toUTC().toISO(), iso)
  })

  test('prints summary with total/inserted/skipped/failed', async ({ assert }) => {
    const path = await tmpFile(
      'sum.csv',
      'url\nhttps://example.com/x\nhttps://example.com/x\nnope\n'
    )
    const command = await ace.create(ImportCsv, [path])
    command.ui.switchMode('raw')
    await command.exec()
    await enrichmentQueue.flush()

    const printed = logsOf(command)
    assert.match(printed, /total[^\n]*3/i)
    assert.match(printed, /inserted[^\n]*1/i)
    assert.match(printed, /skipped[^\n]*1/i)
    assert.match(printed, /failed[^\n]*1/i)
  })
})

test.group('ace export:csv', (group) => {
  group.setup(async () => {
    await ace.boot()
  })

  test('writes all bookmarks including failed with full columns', async ({ assert }) => {
    const { randomUUID } = await import('node:crypto')
    const { hashUrl, normalizeUrl } = await import('@stashit/shared')

    const baseRow = {
      type: 'other' as const,
      ogImage: null,
      embedData: null,
      enrichmentError: null,
      enrichmentFailureReason: null,
      enrichmentAttempts: 0,
      enrichedAt: null,
      embeddingSourceText: null,
      savedCount: 1,
      savedFrom: [] as never[],
    }
    const url1 = normalizeUrl('https://example.com/e1')
    const url2 = normalizeUrl('https://example.com/e2')
    await Bookmark.create({
      ...baseRow,
      id: randomUUID(),
      url: url1,
      urlHash: hashUrl(url1),
      title: 'One',
      description: 'd1',
      tags: ['a', 'b'],
      enrichmentStatus: 'done',
    })
    await Bookmark.create({
      ...baseRow,
      id: randomUUID(),
      url: url2,
      urlHash: hashUrl(url2),
      title: 'Two',
      description: '',
      tags: [],
      enrichmentStatus: 'failed',
    })

    const outPath = await tmpFile('out.csv')
    const exportCmd = await ace.create(ExportCsv, [outPath])
    exportCmd.ui.switchMode('raw')
    await exportCmd.exec()
    assert.equal(exportCmd.exitCode, 0)

    const csv = await readFile(outPath, 'utf8')
    const header = csv.split('\n')[0]
    for (const col of [
      'url',
      'title',
      'description',
      'tags',
      'created_at',
      'type',
      'enrichment_status',
    ]) {
      assert.include(header, col)
    }
    assert.include(csv, 'https://example.com/e1')
    assert.include(csv, 'https://example.com/e2')
    assert.include(csv, 'failed')
    assert.include(csv, 'a|b')
  })

  test('round-trip: import → export → re-import yields zero new inserts', async ({ assert }) => {
    installEnrichmentMocks()
    nock.disableNetConnect()
    nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'))
    nock('https://r.jina.ai').get(/.*/).reply(200, 'mock content. '.repeat(20)).persist()

    try {
      const seedPath = await tmpFile(
        'rt.csv',
        'url,title\nhttps://example.com/rt1,A\nhttps://example.com/rt2,B\n'
      )
      const c1 = await ace.create(ImportCsv, [seedPath])
      c1.ui.switchMode('raw')
      await c1.exec()
      await enrichmentQueue.flush()

      const outPath = await tmpFile('rt-out.csv')
      const c2 = await ace.create(ExportCsv, [outPath])
      c2.ui.switchMode('raw')
      await c2.exec()

      const c3 = await ace.create(ImportCsv, [outPath])
      c3.ui.switchMode('raw')
      await c3.exec()
      await enrichmentQueue.flush()

      const printed = logsOf(c3)
      assert.match(printed, /inserted[^\n]*0/i)
      assert.match(printed, /skipped[^\n]*2/i)
    } finally {
      app.container.restoreAll()
      nock.cleanAll()
      nock.enableNetConnect()
    }
  })
})

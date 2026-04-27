import ace from '@adonisjs/core/services/ace'
import { test } from '@japa/runner'

import ApiKey from '#models/api_key'

import KeyCreate from '../../commands/key_create.js'
import KeyList from '../../commands/key_list.js'
import KeyRevoke from '../../commands/key_revoke.js'

test.group('ace key:create', (group) => {
  group.setup(async () => {
    await ace.boot()
  })

  test('creates an api key and prints the plaintext once', async ({ assert }) => {
    const command = await ace.create(KeyCreate, ['mobile-app'])
    command.ui.switchMode('raw')
    await command.exec()

    assert.equal(command.exitCode, 0)

    const stored = await ApiKey.findByOrFail('name', 'mobile-app')
    assert.isString(stored.keyHash)
    assert.notEqual(stored.keyHash.length, 0)

    const allLogs = command.logger.getLogs().map((l) => l.message)
    const printed = allLogs.join('\n')
    assert.match(printed, /sk_[A-Za-z0-9_-]+/)
    assert.notInclude(printed, stored.keyHash)
  })

  test('rejects duplicate names', async ({ assert }) => {
    const first = await ace.create(KeyCreate, ['dup'])
    first.ui.switchMode('raw')
    await first.exec()
    assert.equal(first.exitCode, 0)

    const second = await ace.create(KeyCreate, ['dup'])
    second.ui.switchMode('raw')
    await second.exec()
    assert.notEqual(second.exitCode, 0)
  })
})

test.group('ace key:list', (group) => {
  group.setup(async () => {
    await ace.boot()
  })

  test('lists keys with name, created_at, last_used_at, revoked status', async ({ assert }) => {
    await ApiKey.generate('alpha')
    const beta = await ApiKey.generate('beta')
    const { DateTime } = await import('luxon')
    beta.key.revokedAt = DateTime.utc()
    await beta.key.save()

    const command = await ace.create(KeyList, [])
    command.ui.switchMode('raw')
    await command.exec()

    assert.equal(command.exitCode, 0)
    const printed = command.logger
      .getLogs()
      .map((l) => l.message)
      .join('\n')
    assert.include(printed, 'alpha')
    assert.include(printed, 'beta')
    assert.match(printed, /revoked/i)
  })
})

test.group('ace key:revoke', (group) => {
  group.setup(async () => {
    await ace.boot()
  })

  test('sets revoked_at on the matching key', async ({ assert }) => {
    await ApiKey.generate('to-revoke')

    const command = await ace.create(KeyRevoke, ['to-revoke'])
    command.ui.switchMode('raw')
    await command.exec()

    assert.equal(command.exitCode, 0)
    const reloaded = await ApiKey.findByOrFail('name', 'to-revoke')
    assert.isNotNull(reloaded.revokedAt)
  })

  test('errors when the named key does not exist', async ({ assert }) => {
    const command = await ace.create(KeyRevoke, ['ghost'])
    command.ui.switchMode('raw')
    await command.exec()
    assert.notEqual(command.exitCode, 0)
  })
})

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class KeyList extends BaseCommand {
  static commandName = 'key:list'
  static description = 'List all API keys with their status'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: ApiKey } = await import('#models/api_key')

    const keys = await ApiKey.query().orderBy('created_at', 'asc')

    if (keys.length === 0) {
      this.logger.info('No API keys found.')
      return
    }

    for (const key of keys) {
      const status = key.revokedAt ? `revoked at ${key.revokedAt.toISO()}` : 'active'
      const lastUsed = key.lastUsedAt?.toISO() ?? '—'
      this.logger.log(
        `${key.name} | created=${key.createdAt.toISO()} | last_used=${lastUsed} | ${status}`
      )
    }
  }
}

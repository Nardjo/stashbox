import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

export default class KeyRevoke extends BaseCommand {
  static commandName = 'key:revoke'
  static description = 'Revoke a named API key'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Name of the API key to revoke' })
  declare name: string

  async run() {
    const { default: ApiKey } = await import('#models/api_key')

    const key = await ApiKey.findBy('name', this.name)
    if (!key) {
      this.logger.error(`No API key named "${this.name}"`)
      this.exitCode = 1
      return
    }

    if (key.revokedAt) {
      this.logger.warning(`API key "${this.name}" is already revoked`)
      return
    }

    key.revokedAt = DateTime.utc()
    await key.save()
    this.logger.success(`API key "${this.name}" revoked`)
  }
}

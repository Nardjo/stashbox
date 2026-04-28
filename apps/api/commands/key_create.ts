import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class KeyCreate extends BaseCommand {
  static commandName = 'key:create'
  static description = 'Create a named API key. Prints the plaintext key once.'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Name for the API key' })
  declare name: string

  async run() {
    const { default: ApiKey } = await import('#models/api_key')

    const existing = await ApiKey.findBy('name', this.name)
    if (existing) {
      this.logger.error(`An API key named "${this.name}" already exists`)
      this.exitCode = 1
      return
    }

    const { plaintext } = await ApiKey.generate(this.name)

    this.logger.info(`API key "${this.name}" created.`)
    this.logger.warning('Store this key now - it will not be shown again:')
    process.stdout.write(plaintext + '\n')
  }
}

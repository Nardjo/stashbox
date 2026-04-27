import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class QueueListen extends BaseCommand {
  static commandName = 'queue:listen'
  static description = 'Start the BullMQ worker process for the enrichment queue'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    const { default: enrichmentQueue } = await import('#services/enrichment_queue')
    const worker = await enrichmentQueue.startWorker()

    this.logger.info('Enrichment worker started')

    worker.on('completed', (job) => {
      this.logger.info(`job ${job.id} completed`)
    })
    worker.on('failed', (job, err) => {
      this.logger.error(`job ${job?.id} failed: ${err.message}`)
    })

    this.app.terminating(async () => {
      this.logger.info('shutting down enrichment worker...')
      await enrichmentQueue.shutdown()
    })
  }
}

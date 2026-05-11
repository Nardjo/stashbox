import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class QueueListen extends BaseCommand {
  static commandName = 'queue:listen'
  static description = 'Start the BullMQ worker processes for enrichment and transcription'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    const { default: enrichmentQueue } = await import('#services/enrichment_queue')
    const { default: transcriptionQueue } = await import('#services/transcription_queue')
    const [enrichmentWorker, transcriptionWorker] = await Promise.all([
      enrichmentQueue.startWorker(),
      transcriptionQueue.startWorker(),
    ])

    this.logger.info('Enrichment and transcription workers started')

    enrichmentWorker.on('completed', (job) => {
      this.logger.info(`enrichment job ${job.id} completed`)
    })
    enrichmentWorker.on('failed', (job, err) => {
      this.logger.error(`enrichment job ${job?.id} failed: ${err.message}`)
    })

    transcriptionWorker.on('completed', (job) => {
      this.logger.info(`transcription job ${job.id} completed`)
    })
    transcriptionWorker.on('failed', (job, err) => {
      this.logger.error(`transcription job ${job?.id} failed: ${err.message}`)
    })

    this.app.terminating(async () => {
      this.logger.info('shutting down queue workers...')
      await Promise.all([enrichmentQueue.shutdown(), transcriptionQueue.shutdown()])
    })
  }
}

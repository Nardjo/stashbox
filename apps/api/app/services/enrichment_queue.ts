import type { Queue, Worker } from 'bullmq'

import EnrichBookmarkJob from '#jobs/enrich_bookmark_job'
import env from '#start/env'

const QUEUE_NAME = 'enrichment'
const JOB_NAME = 'enrich-bookmark'

interface EnrichJobData {
  bookmarkId: string
  content?: string
}

class EnrichmentQueueService {
  private bullQueue: Queue<EnrichJobData> | null = null
  private worker: Worker<EnrichJobData> | null = null
  private inFlight: Promise<void>[] = []

  private get useInProcess(): boolean {
    return env.get('NODE_ENV') === 'test'
  }

  private async getBullQueue(): Promise<Queue<EnrichJobData>> {
    if (this.bullQueue) return this.bullQueue
    const { Queue: BullQueue } = await import('bullmq')
    this.bullQueue = new BullQueue<EnrichJobData>(QUEUE_NAME, {
      connection: { url: env.get('REDIS_URL') },
    })
    return this.bullQueue
  }

  async dispatch(bookmarkId: string, content?: string): Promise<void> {
    if (this.useInProcess) {
      const promise = EnrichBookmarkJob.handle(bookmarkId, content).catch((err) => {
        console.error('[enrichment in-process] job failed', err)
      })
      this.inFlight.push(promise)
      return
    }

    const queue = await this.getBullQueue()
    await queue.add(JOB_NAME, { bookmarkId, content })
  }

  async flush(): Promise<void> {
    const pending = this.inFlight
    this.inFlight = []
    await Promise.all(pending)
  }

  async startWorker(): Promise<Worker<EnrichJobData>> {
    if (this.worker) return this.worker
    const { Worker: BullWorker } = await import('bullmq')
    this.worker = new BullWorker<EnrichJobData>(
      QUEUE_NAME,
      async (job) => {
        await EnrichBookmarkJob.handle(job.data.bookmarkId, job.data.content)
      },
      { connection: { url: env.get('REDIS_URL') } }
    )
    return this.worker
  }

  async shutdown(): Promise<void> {
    if (this.worker) await this.worker.close()
    if (this.bullQueue) await this.bullQueue.close()
    this.worker = null
    this.bullQueue = null
  }
}

const enrichmentQueue = new EnrichmentQueueService()
export default enrichmentQueue

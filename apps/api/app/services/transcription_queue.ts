import type { Queue, Worker } from 'bullmq'

import TranscribeBookmarkJob from '#jobs/transcribe_bookmark_job'
import env from '#start/env'

const QUEUE_NAME = 'transcription'
const JOB_NAME = 'transcribe-bookmark'

interface TranscriptionJobData {
  bookmarkId: string
}

class TranscriptionQueueService {
  private bullQueue: Queue<TranscriptionJobData> | null = null
  private worker: Worker<TranscriptionJobData> | null = null
  private inProcessJobs: TranscriptionJobData[] = []

  private get useInProcess(): boolean {
    return env.get('NODE_ENV') === 'test'
  }

  private async getBullQueue(): Promise<Queue<TranscriptionJobData>> {
    if (this.bullQueue) return this.bullQueue
    const { Queue: BullQueue } = await import('bullmq')
    this.bullQueue = new BullQueue<TranscriptionJobData>(QUEUE_NAME, {
      connection: { url: env.get('REDIS_URL') },
    })
    return this.bullQueue
  }

  async dispatch(bookmarkId: string): Promise<void> {
    if (this.useInProcess) {
      this.inProcessJobs.push({ bookmarkId })
      return
    }

    const queue = await this.getBullQueue()
    await queue.add(JOB_NAME, { bookmarkId })
  }

  async flush(): Promise<void> {
    const pending = this.inProcessJobs
    this.inProcessJobs = []
    await Promise.all(
      pending.map((job) =>
        TranscribeBookmarkJob.handle(job.bookmarkId).catch((err) => {
          console.error('[transcription in-process] job failed', err)
        })
      )
    )
  }

  async startWorker(): Promise<Worker<TranscriptionJobData>> {
    if (this.worker) return this.worker
    const { Worker: BullWorker } = await import('bullmq')
    this.worker = new BullWorker<TranscriptionJobData>(
      QUEUE_NAME,
      async (job) => {
        await TranscribeBookmarkJob.handle(job.data.bookmarkId)
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

const transcriptionQueue = new TranscriptionQueueService()
export default transcriptionQueue

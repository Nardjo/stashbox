import type { Queue, Worker } from 'bullmq'

import CaptureBookmarkJob from '#jobs/capture_bookmark_job'
import env from '#start/env'

const QUEUE_NAME = 'capture'
const JOB_NAME = 'capture-bookmark'

interface CaptureJobData {
  bookmarkId: string
  baseUrl?: string
}

class CaptureQueueService {
  private bullQueue: Queue<CaptureJobData> | null = null
  private worker: Worker<CaptureJobData> | null = null
  private inProcessJobs: CaptureJobData[] = []

  private get useInProcess(): boolean {
    return env.get('NODE_ENV') === 'test'
  }

  private async getBullQueue(): Promise<Queue<CaptureJobData>> {
    if (this.bullQueue) return this.bullQueue
    const { Queue: BullQueue } = await import('bullmq')
    this.bullQueue = new BullQueue<CaptureJobData>(QUEUE_NAME, {
      connection: { url: env.get('REDIS_URL') },
    })
    return this.bullQueue
  }

  async dispatch(bookmarkId: string, baseUrl?: string): Promise<void> {
    if (this.useInProcess) {
      this.inProcessJobs.push({ bookmarkId, baseUrl })
      return
    }

    const queue = await this.getBullQueue()
    await queue.add(JOB_NAME, { bookmarkId, baseUrl })
  }

  async flush(): Promise<void> {
    const pending = this.inProcessJobs
    this.inProcessJobs = []
    await Promise.all(
      pending.map((job) =>
        CaptureBookmarkJob.handle(job.bookmarkId, job.baseUrl).catch((err) => {
          console.error('[capture in-process] job failed', err)
        })
      )
    )
  }

  async startWorker(): Promise<Worker<CaptureJobData>> {
    if (this.worker) return this.worker
    const { Worker: BullWorker } = await import('bullmq')
    this.worker = new BullWorker<CaptureJobData>(
      QUEUE_NAME,
      async (job) => {
        await CaptureBookmarkJob.handle(job.data.bookmarkId, job.data.baseUrl)
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

const captureQueue = new CaptureQueueService()
export default captureQueue

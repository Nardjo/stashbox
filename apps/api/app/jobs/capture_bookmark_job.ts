import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

import Bookmark from '#models/bookmark'
import { storeServerCapture } from '#services/capture_storage'
import ServerCaptureProvider from '#services/server_capture_provider'
import env from '#start/env'

export default class CaptureBookmarkJob {
  static async handle(bookmarkId: string, baseUrl?: string): Promise<void> {
    const bookmark = await Bookmark.find(bookmarkId)
    if (!bookmark || bookmark.capturePath || bookmark.captureUrl) return
    if (bookmark.mediaProvider === 'youtube') return

    try {
      const provider = await app.container.make(ServerCaptureProvider)
      const capture = await provider.capture(bookmark.url)
      const stored = await storeServerCapture(bookmark.id, capture, baseUrl)

      bookmark.capturePath = stored.path
      bookmark.captureUrl = stored.url
      bookmark.captureSource = stored.source
      bookmark.captureMimeType = stored.mimeType
      bookmark.captureWidth = stored.width
      bookmark.captureHeight = stored.height
      bookmark.captureByteSize = stored.byteSize
      bookmark.capturedAt = DateTime.fromISO(stored.capturedAt)
      await bookmark.save()
    } catch (error) {
      if (env.get('NODE_ENV') !== 'test') {
        console.error('[capture] server capture failed', error)
      }
    }
  }
}

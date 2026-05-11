import { DateTime } from 'luxon'

import Bookmark from '#models/bookmark'

export default class TranscribeBookmarkJob {
  static async handle(bookmarkId: string): Promise<void> {
    const bookmark = await Bookmark.find(bookmarkId)
    if (!bookmark || !bookmark.isMedia || bookmark.transcriptionStatus === 'none') return
  }

  static async markTranscribing(bookmark: Bookmark): Promise<void> {
    bookmark.transcriptionStatus = 'transcribing'
    bookmark.transcriptionError = null
    await bookmark.save()
  }

  static async markDone(bookmark: Bookmark, text: string): Promise<void> {
    bookmark.transcriptionStatus = 'done'
    bookmark.transcriptionText = text
    bookmark.transcriptionError = null
    bookmark.transcribedAt = DateTime.utc()
    await bookmark.save()
  }

  static async markFailed(bookmark: Bookmark, error: string): Promise<void> {
    bookmark.transcriptionStatus = 'failed'
    bookmark.transcriptionError = error
    bookmark.transcriptionText = null
    bookmark.transcribedAt = null
    await bookmark.save()
  }
}

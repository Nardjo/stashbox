import { DateTime } from 'luxon'

import Bookmark from '#models/bookmark'

export default class EnrichBookmarkJob {
  static async handle(bookmarkId: string): Promise<void> {
    const bookmark = await Bookmark.find(bookmarkId)
    if (!bookmark) return

    bookmark.enrichmentStatus = 'enriching'
    bookmark.enrichmentAttempts = bookmark.enrichmentAttempts + 1
    await bookmark.save()

    const placeholderTitle = new URL(bookmark.url).hostname

    bookmark.title = placeholderTitle
    bookmark.enrichmentStatus = 'done'
    bookmark.enrichmentError = null
    bookmark.enrichmentFailureReason = null
    bookmark.enrichedAt = DateTime.utc()
    await bookmark.save()
  }
}

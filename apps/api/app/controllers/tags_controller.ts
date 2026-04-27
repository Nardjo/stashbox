import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'

const tagsValidator = vine.compile(
  vine.object({
    minCount: vine.number().positive().optional(),
  })
)

export default class TagsController {
  async index({ request }: HttpContext) {
    const q = await tagsValidator.validate(request.qs())
    const minCount = q.minCount ?? 1

    const result = await db.rawQuery(
      `SELECT tag, COUNT(*)::int AS count
       FROM bookmarks, jsonb_array_elements_text(tags) AS tag
       WHERE enrichment_status IN ('done', 'degraded')
       GROUP BY tag
       HAVING COUNT(*) >= ?
       ORDER BY count DESC, tag ASC`,
      [minCount]
    )
    const rows: Array<{ tag: string; count: number }> = result.rows ?? result
    return { results: rows }
  }
}

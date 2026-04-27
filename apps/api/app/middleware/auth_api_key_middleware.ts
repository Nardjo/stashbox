import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { DateTime } from 'luxon'

import ApiKey from '#models/api_key'

export default class AuthApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const header = ctx.request.header('authorization')
    const match = header?.match(/^Bearer\s+(.+)$/)
    if (!match) {
      return ctx.response.unauthorized({ error: 'unauthorized' })
    }

    const plaintext = match[1].trim()
    const keyHash = ApiKey.hash(plaintext)
    const apiKey = await ApiKey.findBy('keyHash', keyHash)

    if (!apiKey || apiKey.revokedAt !== null) {
      return ctx.response.unauthorized({ error: 'unauthorized' })
    }

    apiKey.lastUsedAt = DateTime.utc()
    void apiKey.save().catch(() => {})

    return next()
  }
}

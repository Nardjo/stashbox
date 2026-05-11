import { readFile } from 'node:fs/promises'

import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

const CAPTURE_FILE_PATTERN = /^[0-9a-f-]{36}\.png$/i

export default class CapturesController {
  async show({ params, response }: HttpContext) {
    const file = String(params.file ?? '')
    if (!CAPTURE_FILE_PATTERN.test(file)) {
      return response.notFound({ error: 'not_found', message: 'Capture not found' })
    }

    try {
      const buffer = await readFile(app.makePath('tmp', 'captures', file))
      return response
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(buffer)
    } catch {
      return response.notFound({ error: 'not_found', message: 'Capture not found' })
    }
  }
}

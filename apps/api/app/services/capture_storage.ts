import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import app from '@adonisjs/core/services/app'
import type { Capture, ClientCaptureInput } from '@stashbox/shared'
import { DateTime } from 'luxon'

import { appUrl } from '#config/app'

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'

export class InvalidCaptureError extends Error {}

export type StoredCapture = Capture & {
  path: string
}

export async function storeClientCapture(
  bookmarkId: string,
  capture: ClientCaptureInput
): Promise<StoredCapture> {
  const buffer = decodePngDataUrl(capture.dataUrl)
  const directory = app.makePath('tmp', 'captures')
  const filename = `${bookmarkId}.png`
  const path = join(directory, filename)
  const capturedAt = DateTime.utc()

  await mkdir(directory, { recursive: true })
  await writeFile(path, buffer)

  return {
    path,
    url: `${appUrl.replace(/\/$/, '')}/captures/${filename}`,
    source: 'client',
    mimeType: 'image/png',
    width: capture.width ?? null,
    height: capture.height ?? null,
    byteSize: buffer.byteLength,
    capturedAt: capturedAt.toISO() ?? capturedAt.toString(),
  }
}

function decodePngDataUrl(value: string): Buffer {
  if (!value.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new InvalidCaptureError('Capture must be a PNG data URL')
  }

  const buffer = Buffer.from(value.slice(PNG_DATA_URL_PREFIX.length), 'base64')
  if (!isPng(buffer)) {
    throw new InvalidCaptureError('Capture data is not a PNG image')
  }

  return buffer
}

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
}

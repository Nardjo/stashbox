import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import type { SiteCredentialCookie } from '@stashbox/shared'

import env from '#start/env'

const algorithm = 'aes-256-gcm'
const version = 'v1'

export function encryptSiteCredentialCookies(
  domain: string,
  cookies: SiteCredentialCookie[]
): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, encryptionKey(), iv)
  cipher.setAAD(Buffer.from(domain, 'utf8'))

  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(cookies), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [version, iv, authTag, ciphertext].map(encodePart).join(':')
}

export function decryptSiteCredentialCookies(
  domain: string,
  encryptedCookies: string
): SiteCredentialCookie[] {
  const [storedVersion, encodedIv, encodedAuthTag, encodedCiphertext] = encryptedCookies.split(':')
  if (
    storedVersion !== version ||
    !encodedIv ||
    !encodedAuthTag ||
    !encodedCiphertext ||
    encryptedCookies.split(':').length !== 4
  ) {
    throw new Error('Unsupported Site credentials ciphertext')
  }

  const decipher = createDecipheriv(algorithm, encryptionKey(), Buffer.from(encodedIv, 'base64url'))
  decipher.setAAD(Buffer.from(domain, 'utf8'))
  decipher.setAuthTag(Buffer.from(encodedAuthTag, 'base64url'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')

  return JSON.parse(plaintext) as SiteCredentialCookie[]
}

function encryptionKey(): Buffer {
  return createHash('sha256').update(env.get('APP_KEY').release()).digest()
}

function encodePart(value: string | Buffer): string {
  return typeof value === 'string' ? value : value.toString('base64url')
}

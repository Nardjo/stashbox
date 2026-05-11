import type { HttpContext } from '@adonisjs/core/http'
import type { SiteCredentialMetadata, SyncSiteCredentialsInput } from '@stashbox/shared'
import { SyncSiteCredentialsInputSchema } from '@stashbox/shared'
import { z } from 'zod'

import SiteCredential from '#models/site_credential'
import { encryptSiteCredentialCookies } from '#services/site_credentials_encryption'

const idSchema = z.string().uuid()

export default class SiteCredentialsController {
  async index() {
    const credentials = await SiteCredential.query().orderBy('updated_at', 'desc')
    return { results: credentials.map(serializeSiteCredential) }
  }

  async sync({ request, response }: HttpContext) {
    const parsed = SyncSiteCredentialsInputSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(422).send({
        error: 'validation_failed',
        details: parsed.error.flatten(),
      })
    }

    let payload: SyncSiteCredentialsInput
    try {
      payload = normalizeSyncPayload(parsed.data)
    } catch {
      return response.status(422).send({
        error: 'validation_failed',
        message: 'Site credentials domain is invalid',
      })
    }
    const encryptedCookies = encryptSiteCredentialCookies(payload.domain, payload.cookies)

    const credential = await SiteCredential.updateOrCreate(
      { domain: payload.domain },
      {
        domain: payload.domain,
        encryptedCookies,
        cookieCount: payload.cookies.length,
      }
    )

    return serializeSiteCredential(credential)
  }

  async show({ params, response }: HttpContext) {
    const id = idSchema.safeParse(params.id)
    if (!id.success) {
      return response.status(422).send({ error: 'validation_failed' })
    }

    const credential = await SiteCredential.find(id.data)
    if (!credential) {
      return response.notFound({ error: 'not_found', message: 'Site credentials not found' })
    }

    return serializeSiteCredential(credential)
  }

  async destroy({ params, response }: HttpContext) {
    const id = idSchema.safeParse(params.id)
    if (!id.success) {
      return response.status(422).send({ error: 'validation_failed' })
    }

    const credential = await SiteCredential.find(id.data)
    if (!credential) {
      return response.notFound({ error: 'not_found', message: 'Site credentials not found' })
    }

    await credential.delete()
    return response.noContent()
  }
}

export function normalizeSiteCredentialDomain(value: string): string {
  const input = value.trim().toLowerCase()
  const url = new URL(input.includes('://') ? input : `https://${input}`)
  const domain = url.hostname.replace(/^\.+/, '')

  if (!domain) {
    throw new Error('Site credentials domain is required')
  }

  return domain
}

export function serializeSiteCredential(credential: SiteCredential): SiteCredentialMetadata {
  return {
    id: credential.id,
    domain: credential.domain,
    cookieCount: credential.cookieCount,
    createdAt: credential.createdAt.toISO() ?? credential.createdAt.toString(),
    updatedAt: credential.updatedAt.toISO() ?? credential.updatedAt.toString(),
  }
}

function normalizeSyncPayload(payload: SyncSiteCredentialsInput): SyncSiteCredentialsInput {
  return {
    ...payload,
    domain: normalizeSiteCredentialDomain(payload.domain),
  }
}

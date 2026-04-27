import { createHmac, randomBytes } from 'node:crypto'

import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import env from '#start/env'

export default class ApiKey extends BaseModel {
  static table = 'api_keys'
  static selfAssignPrimaryKey = false

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare keyHash: string

  @column.dateTime()
  declare lastUsedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime()
  declare revokedAt: DateTime | null

  static hash(plaintext: string): string {
    return createHmac('sha256', env.get('APP_KEY').release()).update(plaintext).digest('hex')
  }

  static async generate(name: string): Promise<{ key: ApiKey; plaintext: string }> {
    const plaintext = `sk_${randomBytes(32).toString('base64url')}`
    const key = await ApiKey.create({
      name,
      keyHash: ApiKey.hash(plaintext),
    })
    return { key, plaintext }
  }
}

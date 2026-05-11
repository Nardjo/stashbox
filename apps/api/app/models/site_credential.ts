import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class SiteCredential extends BaseModel {
  static table = 'site_credentials'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare domain: string

  @column()
  declare encryptedCookies: string

  @column()
  declare cookieCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

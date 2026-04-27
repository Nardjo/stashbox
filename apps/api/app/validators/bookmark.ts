import vine from '@vinejs/vine'

const SAVED_FROM_VALUES = [
  'ios-shortcut',
  'chrome-extension',
  'firefox-extension',
  'cli',
  'mcp',
  'import-csv',
  'api',
] as const

export const createBookmarkValidator = vine.compile(
  vine.object({
    url: vine.string().url(),
    title: vine.string().optional(),
    content: vine.string().optional(),
    sharedFrom: vine.enum(SAVED_FROM_VALUES).optional(),
  })
)

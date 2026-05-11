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
    capture: vine
      .object({
        dataUrl: vine
          .string()
          .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)
          .maxLength(14_000_000),
        width: vine.number().positive().max(20_000).optional(),
        height: vine.number().positive().max(20_000).optional(),
      })
      .optional(),
  })
)

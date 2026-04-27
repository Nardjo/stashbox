import vine from '@vinejs/vine'

export const createBookmarkValidator = vine.compile(
  vine.object({
    url: vine.string().url(),
    title: vine.string().optional(),
    content: vine.string().optional(),
  })
)

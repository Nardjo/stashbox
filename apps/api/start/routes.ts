import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const BookmarksController = () => import('#controllers/bookmarks_controller')

router.get('/', () => ({ ok: true }))

router
  .group(() => {
    router.post('/bookmarks', [BookmarksController, 'store'])
    router.get('/bookmarks/:id', [BookmarksController, 'show'])
    router.delete('/bookmarks/:id', [BookmarksController, 'destroy'])
  })
  .use(middleware.authApiKey())

import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

const BookmarksController = () => import('#controllers/bookmarks_controller')
const SearchController = () => import('#controllers/search_controller')
const TagsController = () => import('#controllers/tags_controller')

router.get('/', () => ({ ok: true }))

router
  .group(() => {
    router.post('/search', [SearchController, 'handle'])
    router.get('/tags', [TagsController, 'index'])
    router.post('/bookmarks', [BookmarksController, 'store'])
    router.get('/bookmarks', [BookmarksController, 'index'])
    router.get('/bookmarks/failed', [BookmarksController, 'failed'])
    router.post('/bookmarks/:id/refresh', [BookmarksController, 'refresh'])
    router.get('/bookmarks/:id', [BookmarksController, 'show'])
    router.delete('/bookmarks/:id', [BookmarksController, 'destroy'])
  })
  .use(middleware.authApiKey())

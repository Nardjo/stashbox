import router from '@adonisjs/core/services/router'

const BookmarksController = () => import('#controllers/bookmarks_controller')

router.get('/', () => ({ ok: true }))

router.post('/bookmarks', [BookmarksController, 'store'])
router.get('/bookmarks/:id', [BookmarksController, 'show'])
router.delete('/bookmarks/:id', [BookmarksController, 'destroy'])

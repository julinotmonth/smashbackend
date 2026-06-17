const express = require('express')
const router = express.Router()
const { getAll, getById, update, create } = require('../controllers/courtController')
const { authenticate, requireAdmin } = require('../middleware/auth')

router.get('/', getAll)
router.get('/:id', getById)
router.post('/', authenticate, requireAdmin, create)
router.patch('/:id', authenticate, requireAdmin, update)

module.exports = router

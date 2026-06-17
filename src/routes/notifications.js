const express = require('express')
const router = express.Router()
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController')
const { authenticate } = require('../middleware/auth')

router.get('/', authenticate, getNotifications)
router.patch('/read-all', authenticate, markAllAsRead)
router.patch('/:id/read', authenticate, markAsRead)

module.exports = router

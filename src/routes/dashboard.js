const express = require('express')
const router = express.Router()
const { getStats } = require('../controllers/dashboardController')
const { authenticate, requireAdmin } = require('../middleware/auth')

router.get('/stats', authenticate, requireAdmin, getStats)

module.exports = router

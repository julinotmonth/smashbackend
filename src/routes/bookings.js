const express = require('express')
const router = express.Router()
const upload = require('../middleware/upload')
const {
  create, getMyBookings, getAll, getById, confirm, reject, cancel
} = require('../controllers/bookingController')
const { authenticate, requireAdmin } = require('../middleware/auth')

// User routes
router.post('/', authenticate, upload.single('paymentProof'), create)
router.get('/my', authenticate, getMyBookings)
router.get('/:id', authenticate, getById)
router.patch('/:id/cancel', authenticate, cancel)

// Admin routes
router.get('/', authenticate, requireAdmin, getAll)
router.patch('/:id/confirm', authenticate, requireAdmin, confirm)
router.patch('/:id/reject', authenticate, requireAdmin, reject)

module.exports = router

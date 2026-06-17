const express = require('express')
const router = express.Router()
const { getAvailability } = require('../controllers/scheduleController')

router.get('/', getAvailability)

module.exports = router

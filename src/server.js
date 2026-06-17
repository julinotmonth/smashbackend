require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// ─── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Static files for uploaded payment proofs
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/courts', require('./routes/courts'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/schedule', require('./routes/schedule'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/dashboard', require('./routes/dashboard'))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SmashArena API' })
})

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} tidak ditemukan` })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Ukuran file terlalu besar. Maksimal 5MB' })
  }
  if (err.message?.includes('Format file tidak valid')) {
    return res.status(400).json({ message: err.message })
  }
  res.status(500).json({ message: 'Terjadi kesalahan internal server' })
})

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 SmashArena API berjalan di http://localhost:${PORT}`)
  console.log(`📖 Health check: http://localhost:${PORT}/api/health`)
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('\n📋 Available routes:')
  console.log('   POST   /api/auth/register')
  console.log('   POST   /api/auth/login')
  console.log('   GET    /api/auth/me')
  console.log('   GET    /api/courts')
  console.log('   GET    /api/schedule?date=YYYY-MM-DD')
  console.log('   POST   /api/bookings          (with multipart/form-data)')
  console.log('   GET    /api/bookings/my')
  console.log('   GET    /api/bookings           (admin)')
  console.log('   PATCH  /api/bookings/:id/confirm  (admin)')
  console.log('   PATCH  /api/bookings/:id/reject   (admin)')
  console.log('   GET    /api/dashboard/stats   (admin)')
  console.log('   GET    /api/notifications')
})

module.exports = app

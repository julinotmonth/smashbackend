const jwt = require('jsonwebtoken')
const pool = require('../config/db')

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token tidak ditemukan' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const result = await pool.query(
      'SELECT id, name, email, phone, role FROM users WHERE id = $1',
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User tidak ditemukan' })
    }

    req.user = result.rows[0]
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, silakan login ulang' })
    }
    return res.status(401).json({ message: 'Token tidak valid' })
  }
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Akses ditolak, hanya untuk admin' })
  }
  next()
}

module.exports = { authenticate, requireAdmin }

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, phone, hashedPassword]
    )

    const user = result.rows[0]
    const token = generateToken(user)

    res.status(201).json({
      message: 'Registrasi berhasil',
      user,
      token
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' })
    }

    const user = result.rows[0]
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email atau password salah' })
    }

    const token = generateToken(user)

    res.json({
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// GET /api/auth/me
const me = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
      }
    })
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body
    const userId = req.user.id

    const result = await pool.query(
      `UPDATE users SET name = $1, phone = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, email, phone, role`,
      [name, phone, userId]
    )

    res.json({
      message: 'Profil berhasil diperbarui',
      user: result.rows[0]
    })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

module.exports = { register, login, me, updateProfile }

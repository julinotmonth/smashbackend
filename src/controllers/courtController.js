const pool = require('../config/db')

// Helper: format DB row (snake_case) to camelCase shape expected by frontend
const formatCourt = (row) => {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    pricePerHour: row.price_per_hour,
    price_per_hour: row.price_per_hour, // keep for backward-compat
    isActive: row.is_active,
    status: row.is_active ? 'active' : 'maintenance',
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// GET /api/courts
const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM courts ORDER BY id ASC'
    )
    res.json({ courts: result.rows.map(formatCourt) })
  } catch (err) {
    console.error('Get courts error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// GET /api/courts/:id
const getById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courts WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lapangan tidak ditemukan' })
    }
    res.json({ court: formatCourt(result.rows[0]) })
  } catch (err) {
    console.error('Get court error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// PATCH /api/courts/:id (admin only)
// Accepts: name, price_per_hour / pricePerHour, is_active / isActive, status ('active'|'maintenance'), description
const update = async (req, res) => {
  try {
    const { name, price_per_hour, pricePerHour, is_active, isActive, status, description } = req.body
    const courtId = parseInt(req.params.id)

    const existing = await pool.query('SELECT * FROM courts WHERE id = $1', [courtId])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Lapangan tidak ditemukan' })
    }

    const current = existing.rows[0]

    // Resolve price from either naming convention
    const resolvedPrice = price_per_hour ?? pricePerHour ?? current.price_per_hour

    // Resolve active state from isActive boolean, is_active boolean, or status string
    let resolvedActive = current.is_active
    if (typeof is_active === 'boolean') resolvedActive = is_active
    else if (typeof isActive === 'boolean') resolvedActive = isActive
    else if (status === 'active') resolvedActive = true
    else if (status === 'maintenance' || status === 'inactive') resolvedActive = false

    const result = await pool.query(
      `UPDATE courts
       SET name = $1, price_per_hour = $2, is_active = $3, description = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        name ?? current.name,
        resolvedPrice,
        resolvedActive,
        description ?? current.description,
        courtId
      ]
    )

    res.json({ message: 'Lapangan berhasil diperbarui', court: formatCourt(result.rows[0]) })
  } catch (err) {
    console.error('Update court error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// POST /api/courts (admin only)
const create = async (req, res) => {
  try {
    const { name, price_per_hour, pricePerHour, description } = req.body
    const resolvedPrice = price_per_hour ?? pricePerHour ?? 50000

    const result = await pool.query(
      'INSERT INTO courts (name, price_per_hour, description) VALUES ($1, $2, $3) RETURNING *',
      [name, resolvedPrice, description || '']
    )

    res.status(201).json({ message: 'Lapangan berhasil ditambahkan', court: formatCourt(result.rows[0]) })
  } catch (err) {
    console.error('Create court error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

module.exports = { getAll, getById, update, create }

const pool = require('../config/db')

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const role = req.user.role
    let result

    if (role === 'admin') {
      result = await pool.query(
        `SELECT * FROM notifications WHERE role = 'admin' ORDER BY created_at DESC LIMIT 50`
      )
    } else {
      result = await pool.query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.user.id]
      )
    }

    res.json({ notifications: result.rows })
  } catch (err) {
    console.error('Get notifications error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const role = req.user.role
    let query, params

    if (role === 'admin') {
      query = `UPDATE notifications SET is_read = true WHERE id = $1 AND role = 'admin' RETURNING *`
      params = [req.params.id]
    } else {
      query = `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`
      params = [req.params.id, req.user.id]
    }

    await pool.query(query, params)
    res.json({ success: true })
  } catch (err) {
    console.error('Mark read error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// PATCH /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    const role = req.user.role

    if (role === 'admin') {
      await pool.query(`UPDATE notifications SET is_read = true WHERE role = 'admin'`)
    } else {
      await pool.query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1`,
        [req.user.id]
      )
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Mark all read error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead }

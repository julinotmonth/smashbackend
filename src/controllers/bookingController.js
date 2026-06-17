const pool = require('../config/db')
const path = require('path')

// Generate booking code: EG-YYYYMMDD-XXXX
const generateBookingCode = (date) => {
  const dateStr = date.replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `EG-${dateStr}-${rand}`
}

// Add notification helper
const addNotification = async (client, userId, role, message) => {
  await client.query(
    'INSERT INTO notifications (user_id, role, message) VALUES ($1, $2, $3)',
    [userId || null, role, message]
  )
}

// POST /api/bookings
const create = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      fullName, phone, date, courtId, startTime, duration, totalPrice
    } = req.body

    const durationNum = parseInt(duration)
    const startHour = parseInt(startTime.split(':')[0])
    const endHour = startHour + durationNum
    const endTime = `${String(endHour).padStart(2, '0')}:00`

    // Get court info
    const courtResult = await client.query('SELECT * FROM courts WHERE id = $1 AND is_active = true', [courtId])
    if (courtResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lapangan tidak ditemukan atau tidak aktif' })
    }
    const court = courtResult.rows[0]

    // Check slot availability - no overlap with existing confirmed/pending/waiting_payment bookings
    const conflictCheck = await client.query(`
      SELECT id FROM bookings
      WHERE court_id = $1
        AND date = $2
        AND status NOT IN ('rejected', 'cancelled')
        AND (
          (start_time <= $3::time AND end_time > $3::time)
          OR (start_time < $4::time AND end_time >= $4::time)
          OR (start_time >= $3::time AND end_time <= $4::time)
        )
    `, [courtId, date, startTime, endTime])

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Jadwal yang dipilih sudah terisi, silakan pilih waktu lain' })
    }

    // Generate unique booking code
    let bookingCode
    let attempts = 0
    do {
      bookingCode = generateBookingCode(date)
      const exists = await client.query('SELECT id FROM bookings WHERE booking_code = $1', [bookingCode])
      if (exists.rows.length === 0) break
      attempts++
    } while (attempts < 10)

    // Handle payment proof file
    const paymentProof = req.file ? req.file.filename : null

    const calculatedPrice = court.price_per_hour * durationNum

    const result = await client.query(`
      INSERT INTO bookings (
        booking_code, user_id, user_name, user_phone,
        court_id, court_name, date, start_time, end_time,
        duration, total_price, status, payment_proof
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'waiting_payment', $12)
      RETURNING *
    `, [
      bookingCode,
      req.user.id,
      fullName,
      phone,
      courtId,
      court.name,
      date,
      startTime,
      endTime,
      durationNum,
      totalPrice || calculatedPrice,
      paymentProof,
    ])

    const booking = result.rows[0]

    // Notify admin
    await addNotification(
      client, null, 'admin',
      `User ${booking.user_name} memesan ${booking.court_name} pada ${booking.date} jam ${booking.start_time}.`
    )

    await client.query('COMMIT')

    res.status(201).json({
      message: 'Booking berhasil dibuat',
      booking: formatBooking(booking)
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Create booking error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  } finally {
    client.release()
  }
}

// GET /api/bookings/my
const getMyBookings = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let whereClause = 'WHERE b.user_id = $1'
    const params = [req.user.id]
    let paramIndex = 2

    if (status && status !== 'all') {
      whereClause += ` AND b.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (search) {
      whereClause += ` AND (b.booking_code ILIKE $${paramIndex} OR b.date::text ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM bookings b ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    const result = await pool.query(
      `SELECT b.* FROM bookings b ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    )

    res.json({
      bookings: result.rows.map(formatBooking),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (err) {
    console.error('Get my bookings error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// GET /api/bookings (admin)
const getAll = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let whereClause = 'WHERE 1=1'
    const params = []
    let paramIndex = 1

    if (status && status !== 'all') {
      whereClause += ` AND b.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (search) {
      whereClause += ` AND (b.booking_code ILIKE $${paramIndex} OR b.user_name ILIKE $${paramIndex} OR b.court_name ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM bookings b ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    const result = await pool.query(
      `SELECT b.* FROM bookings b ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    )

    res.json({
      bookings: result.rows.map(formatBooking),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (err) {
    console.error('Get all bookings error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// GET /api/bookings/:id
const getById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan' })
    }

    const booking = result.rows[0]

    // Only allow owner or admin to view
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Akses ditolak' })
    }

    res.json({ booking: formatBooking(booking) })
  } catch (err) {
    console.error('Get booking error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// PATCH /api/bookings/:id/confirm (admin)
const confirm = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan' })
    }

    const booking = result.rows[0]

    if (!['waiting_payment', 'pending'].includes(booking.status)) {
      return res.status(400).json({ message: `Booking dengan status "${booking.status}" tidak bisa dikonfirmasi` })
    }

    const updated = await client.query(
      `UPDATE bookings SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    )

    // Notify the booking user
    if (booking.user_id) {
      await addNotification(
        client, booking.user_id, 'user',
        `Hore! Booking Anda (${booking.booking_code}) untuk ${booking.court_name} telah dikonfirmasi.`
      )
    }

    await client.query('COMMIT')
    res.json({ message: 'Booking berhasil dikonfirmasi', booking: formatBooking(updated.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Confirm booking error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  } finally {
    client.release()
  }
}

// PATCH /api/bookings/:id/reject (admin)
const reject = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan' })
    }

    const booking = result.rows[0]

    if (booking.status === 'confirmed' || booking.status === 'rejected') {
      return res.status(400).json({ message: `Booking sudah ${booking.status}` })
    }

    const updated = await client.query(
      `UPDATE bookings SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    )

    if (booking.user_id) {
      await addNotification(
        client, booking.user_id, 'user',
        `Maaf, Booking Anda (${booking.booking_code}) untuk ${booking.court_name} telah ditolak.`
      )
    }

    await client.query('COMMIT')
    res.json({ message: 'Booking berhasil ditolak', booking: formatBooking(updated.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Reject booking error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  } finally {
    client.release()
  }
}

// PATCH /api/bookings/:id/cancel (user)
const cancel = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking tidak ditemukan' })
    }

    const booking = result.rows[0]

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Akses ditolak' })
    }

    if (!['waiting_payment', 'pending'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking tidak bisa dibatalkan' })
    }

    const updated = await client.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    )

    await client.query('COMMIT')
    res.json({ message: 'Booking berhasil dibatalkan', booking: formatBooking(updated.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Cancel booking error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  } finally {
    client.release()
  }
}

// Helper: format booking row to camelCase with payment proof URL
const formatBooking = (row) => {
  if (!row) return null
  return {
    id: row.id,
    bookingCode: row.booking_code,
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    courtId: row.court_id,
    courtName: row.court_name,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    startTime: typeof row.start_time === 'string' ? row.start_time.slice(0, 5) : row.start_time,
    endTime: typeof row.end_time === 'string' ? row.end_time.slice(0, 5) : row.end_time,
    duration: row.duration,
    totalPrice: row.total_price,
    status: row.status,
    paymentProof: row.payment_proof,
    paymentProofUrl: row.payment_proof
      ? `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/payments/${row.payment_proof}`
      : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = { create, getMyBookings, getAll, getById, confirm, reject, cancel }

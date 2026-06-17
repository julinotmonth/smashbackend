const pool = require('../config/db')

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
]

// GET /api/schedule?date=YYYY-MM-DD
const getAvailability = async (req, res) => {
  try {
    const { date } = req.query
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Format tanggal tidak valid (YYYY-MM-DD)' })
    }

    // Get all active courts
    const courtsResult = await pool.query('SELECT * FROM courts ORDER BY id ASC')
    const courts = courtsResult.rows

    // Get all bookings for this date that are NOT rejected/cancelled
    const bookingsResult = await pool.query(`
      SELECT court_id, start_time, end_time, status, user_name, booking_code
      FROM bookings
      WHERE date = $1 AND status NOT IN ('rejected', 'cancelled')
    `, [date])
    const bookings = bookingsResult.rows

    const todayDate = new Date().toISOString().split('T')[0]
    const currentHour = new Date().getHours()

    // Build schedule
    const schedule = {}
    courts.forEach(court => {
      schedule[court.id] = {}
      TIME_SLOTS.forEach(slot => {
        const slotHour = parseInt(slot.split(':')[0])
        let status = 'available'

        if (!court.is_active) {
          status = 'closed'
        } else if (date < todayDate) {
          status = 'closed'
        } else if (date === todayDate && slotHour <= currentHour) {
          status = 'closed'
        } else {
          // Find booking covering this slot
          const booking = bookings.find(b => {
            if (b.court_id !== court.id) return false
            const bStart = parseInt(b.start_time.split(':')[0])
            const bEnd = parseInt(b.end_time.split(':')[0])
            return slotHour >= bStart && slotHour < bEnd
          })

          if (booking) {
            status = booking.status === 'confirmed' ? 'booked' : 'pending'
          }
        }

        schedule[court.id][slot] = {
          courtId: court.id,
          time: slot,
          date,
          status,
          bookedBy: status === 'booked' || status === 'pending' ? 'User' : null,
        }
      })
    })

    res.json({ schedule, date, courts })
  } catch (err) {
    console.error('Get availability error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

module.exports = { getAvailability }

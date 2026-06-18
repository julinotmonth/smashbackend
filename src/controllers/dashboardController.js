const pool = require('../config/db')

// Get current date in WIB (UTC+7), regardless of server's own timezone (Railway runs in UTC)
const getTodayInWIB = () => {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().split('T')[0]
}

// GET /api/dashboard/stats (admin)
const getStats = async (req, res) => {
  try {
    const today = getTodayInWIB()

    const [todayBookings, pendingCount, totalUsers, totalBookings, bookingsByDay, bookingsByCourt, revenue] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM bookings WHERE date = $1 AND status NOT IN ('rejected','cancelled')`,
        [today]
      ),
      pool.query(
        `SELECT COUNT(*) FROM bookings WHERE status IN ('waiting_payment', 'pending')`
      ),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'user'`),
      pool.query(`SELECT COUNT(*) FROM bookings WHERE status NOT IN ('rejected','cancelled')`),
      // Booking trend last 7 days
      pool.query(`
        SELECT 
          TO_CHAR(date, 'Dy') as day_name,
          date,
          COUNT(*) as total
        FROM bookings
        WHERE date >= CURRENT_DATE - INTERVAL '6 days'
          AND status NOT IN ('rejected', 'cancelled')
        GROUP BY date
        ORDER BY date ASC
      `),
      // Bookings per court (all time)
      pool.query(`
        SELECT court_name, COUNT(*) as value
        FROM bookings
        WHERE status NOT IN ('rejected', 'cancelled')
        GROUP BY court_name
        ORDER BY court_name
      `),
      // Revenue this month
      pool.query(`
        SELECT COALESCE(SUM(total_price), 0) as total
        FROM bookings
        WHERE status = 'confirmed'
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
      `)
    ])

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const now = new Date()
      const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      wib.setUTCDate(wib.getUTCDate() - i)
      const dateStr = wib.toISOString().split('T')[0]
      const found = bookingsByDay.rows.find(r => r.date.toISOString().split('T')[0] === dateStr)
      last7.push({
        name: dayNames[wib.getUTCDay()],
        total: found ? parseInt(found.total) : 0
      })
    }

    res.json({
      stats: {
        todayBookings: parseInt(todayBookings.rows[0].count),
        pendingCount: parseInt(pendingCount.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalBookings: parseInt(totalBookings.rows[0].count),
        monthlyRevenue: parseInt(revenue.rows[0].total),
      },
      bookingTrend: last7,
      courtDistribution: bookingsByCourt.rows.map(r => ({
        name: r.court_name,
        value: parseInt(r.value)
      })),
    })
  } catch (err) {
    console.error('Dashboard stats error:', err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

module.exports = { getStats }
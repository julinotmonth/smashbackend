require('dotenv').config()
const pool = require('../config/db')
const bcrypt = require('bcryptjs')

const seed = async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    console.log('🌱 Seeding database...')

    // Seed Courts
    const courtsResult = await client.query('SELECT COUNT(*) FROM courts')
    if (parseInt(courtsResult.rows[0].count) === 0) {
      const courts = [
        { name: 'Lapangan 1', price: 50000, desc: 'Lapangan standar badminton dengan pencahayaan LED' },
        { name: 'Lapangan 2', price: 50000, desc: 'Lapangan standar badminton dengan pencahayaan LED' },
        { name: 'Lapangan 3', price: 50000, desc: 'Lapangan standar badminton dengan pencahayaan LED' },
        { name: 'Lapangan 4', price: 50000, desc: 'Lapangan standar badminton dengan pencahayaan LED' },
        { name: 'Lapangan 5', price: 60000, desc: 'Lapangan premium dengan AC dan karpet vinyl' },
        { name: 'Lapangan 6', price: 60000, desc: 'Lapangan premium dengan AC dan karpet vinyl' },
      ]

      for (const court of courts) {
        await client.query(
          'INSERT INTO courts (name, price_per_hour, description) VALUES ($1, $2, $3)',
          [court.name, court.price, court.desc]
        )
      }
      console.log('  ✅ Seeded: courts (6 courts)')
    } else {
      console.log('  ⏭️  Skipped: courts (already exists)')
    }

    // Seed Admin User
    const adminResult = await client.query("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    if (parseInt(adminResult.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await client.query(
        'INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5)',
        ['Admin SmashArena', 'admin@smasharena.com', '081200000000', hashedPassword, 'admin']
      )
      console.log('  ✅ Seeded: admin user (admin@smasharena.com / admin123)')
    } else {
      console.log('  ⏭️  Skipped: admin user (already exists)')
    }

    // Seed demo user
    const userResult = await client.query("SELECT COUNT(*) FROM users WHERE email = 'ahmad@gmail.com'")
    if (parseInt(userResult.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('password', 10)
      await client.query(
        'INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5)',
        ['Ahmad Rizky', 'ahmad@gmail.com', '081234567890', hashedPassword, 'user']
      )
      console.log('  ✅ Seeded: demo user (ahmad@gmail.com / password)')
    } else {
      console.log('  ⏭️  Skipped: demo user (already exists)')
    }

    await client.query('COMMIT')
    console.log('\n✅ Seeding completed!')
    console.log('\n📋 Default credentials:')
    console.log('   Admin: admin@smasharena.com / admin123')
    console.log('   User:  ahmad@gmail.com / password')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Seeding failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})

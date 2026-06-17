require('dotenv').config()
const pool = require('../config/db')

const createTables = async () => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔧 Running migrations...')

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('  ✅ Table: users')

    // Courts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price_per_hour INTEGER NOT NULL DEFAULT 50000,
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('  ✅ Table: courts')

    // Bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_code VARCHAR(30) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(100) NOT NULL,
        user_phone VARCHAR(20) NOT NULL,
        court_id INTEGER REFERENCES courts(id) ON DELETE SET NULL,
        court_name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration INTEGER NOT NULL,
        total_price INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'waiting_payment' 
          CHECK (status IN ('waiting_payment', 'pending', 'confirmed', 'rejected', 'cancelled')),
        payment_proof VARCHAR(255),
        notes TEXT,
        confirmed_by INTEGER REFERENCES users(id),
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('  ✅ Table: bookings')

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(10),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('  ✅ Table: notifications')

    // Index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
      CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings(court_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `)
    console.log('  ✅ Indexes created')

    await client.query('COMMIT')
    console.log('\n✅ All migrations completed successfully!')
    
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

createTables().catch((err) => {
  console.error(err)
  process.exit(1)
})

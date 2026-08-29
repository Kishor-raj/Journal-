import pg from 'pg'
import { env } from './env.js'

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
})

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err)
})

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('Database connected:', result.rows[0].now)
    return true
  } catch (err) {
    console.error('Database connection failed:', err.message)
    return false
  }
}

export default pool

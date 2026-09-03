import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}
dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
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

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}
dotenv.config()

import { testConnection } from './config/db.js'
import app from './app.js'

const PORT = parseInt(process.env.PORT || '3001', 10)
const NODE_ENV = process.env.NODE_ENV || 'development'

async function start() {
  const dbOk = await testConnection()
  if (!dbOk) {
    console.error('Failed to connect to database. Exiting.')
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${NODE_ENV}]`)
  })
}

start()

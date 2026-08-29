import { env } from './config/env.js'
import { testConnection } from './config/db.js'
import app from './app.js'

async function start() {
  const dbOk = await testConnection()
  if (!dbOk) {
    console.error('Failed to connect to database. Exiting.')
    process.exit(1)
  }

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`)
  })
}

start()

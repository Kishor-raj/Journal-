import pg from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, 'migrations')

async function ensureSchemaMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await pool.query(`
    ALTER TABLE schema_migrations ALTER COLUMN version TYPE VARCHAR(255);
  `).catch(() => {})
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version')
  return result.rows.map(r => r.version)
}

function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.includes('.down.sql'))
    .sort()
}

async function countPublicTables() {
  const result = await pool.query(`
    SELECT count(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> 'schema_migrations'
  `)
  return result.rows[0].count
}

async function baseline() {
  await ensureSchemaMigrations()
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()
  const versions = files.map(f => f.replace(/\.sql$/, ''))
  const pending = versions.filter(v => !applied.includes(v))

  if (pending.length === 0) {
    console.log('All migrations are already recorded. Nothing to baseline.')
    await pool.end()
    return
  }

  await pool.query('BEGIN')
  try {
    for (const version of pending) {
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [version]
      )
    }
    await pool.query('COMMIT')
  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }

  console.log(`Baselined ${pending.length} migration(s) as already applied:`)
  for (const version of pending) console.log(`  • ${version}`)
  await pool.end()
}

async function migrate() {
  await ensureSchemaMigrations()
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()

  // Guard against a database whose schema was created/restored outside the
  // migration runner. Without this check the first migration fails with a
  // cryptic "type/table already exists" error.
  if (applied.length === 0) {
    const tableCount = await countPublicTables()
    if (tableCount > 0) {
      console.error(
        `Database already has ${tableCount} table(s) but schema_migrations is empty.`
      )
      console.error(
        'This usually means the database was restored or created outside the migration runner.'
      )
      console.error(
        'If the schema is already up to date, record it with: npm run migrate:baseline'
      )
      console.error(
        'Otherwise, drop/recreate the database and run: npm run migrate'
      )
      await pool.end()
      process.exit(1)
    }
  }

  for (const file of files) {
    const key = file.replace(/\.sql$/, '')
    const shortVersion = file.split('_')[0]

    if (applied.includes(key) || applied.includes(file)) {
      continue
    }

    // Check if applied under legacy shortVersion when only one migration had that prefix
    const matchingShort = files.filter(f => f.startsWith(`${shortVersion}_`))
    if (matchingShort.length === 1 && applied.includes(shortVersion)) {
      continue
    }

    console.log(`Applying migration: ${file}`)
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')

    await pool.query('BEGIN')
    try {
      await pool.query(sql)
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [key]
      )
      await pool.query('COMMIT')
      console.log(`  ✓ Applied ${file}`)
    } catch (err) {
      await pool.query('ROLLBACK')
      console.error(`  ✗ Failed ${file}:`, err.message)
      throw err
    }
  }

  console.log('All migrations applied.')
  await pool.end()
}

async function rollback() {
  await ensureSchemaMigrations()
  const applied = await getAppliedMigrations()

  if (applied.length === 0) {
    console.log('No migrations to rollback.')
    await pool.end()
    return
  }

  const lastVersion = applied[applied.length - 1]
  const allFiles = fs.readdirSync(MIGRATIONS_DIR).sort()
  const downFile = allFiles.find(f => f.startsWith(lastVersion) && f.endsWith('.down.sql'))

  if (!downFile) {
    console.log(`No rollback file for migration ${lastVersion}`)
    await pool.end()
    return
  }

  console.log(`Rolling back migration: ${downFile}`)
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, downFile), 'utf8')

  await pool.query('BEGIN')
  try {
    await pool.query(sql)
    await pool.query('DELETE FROM schema_migrations WHERE version = $1', [lastVersion])
    await pool.query('COMMIT')
    console.log(`  ✓ Rolled back ${downFile}`)
  } catch (err) {
    await pool.query('ROLLBACK')
    console.error(`  ✗ Rollback failed ${downFile}:`, err.message)
    throw err
  }

  await pool.end()
}

const command = process.argv[2]
if (command === 'rollback') {
  rollback().catch(err => { console.error(err); process.exit(1) })
} else if (command === 'baseline') {
  baseline().catch(err => { console.error(err); process.exit(1) })
} else {
  migrate().catch(err => { console.error(err); process.exit(1) })
}

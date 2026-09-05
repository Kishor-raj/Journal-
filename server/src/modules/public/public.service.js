import pool from '../../config/db.js'

/**
 * Returns all published manuscripts with their authors, ordered newest first.
 */
export async function getPublishedArticles() {
  const { rows } = await pool.query(`
    SELECT
      m.id,
      m.title,
      m.abstract,
      m.keywords,
      m.submission_number,
      m.submitted_at,
      m.updated_at,
      COALESCE(c.name, 'Research Article') AS category,
      COALESCE(
        json_agg(
          json_build_object(
            'first_name', ma.first_name,
            'last_name',  ma.last_name,
            'is_corresponding', ma.is_corresponding
          ) ORDER BY ma.author_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'
      ) AS authors
    FROM manuscripts m
    LEFT JOIN categories c ON c.id = m.category_id
    LEFT JOIN manuscript_authors ma ON ma.manuscript_id = m.id
    WHERE m.current_status = 'published'
    GROUP BY m.id, c.name
    ORDER BY m.updated_at DESC
  `)
  return rows
}

/**
 * Returns the most recently published manuscripts (limited to `limit`).
 * Used for the home-page featured section.
 */
export async function getFeaturedArticles(limit = 6) {
  const { rows } = await pool.query(`
    SELECT
      m.id,
      m.title,
      m.abstract,
      m.keywords,
      m.submission_number,
      m.updated_at,
      COALESCE(c.name, 'Research Article') AS category,
      COALESCE(
        json_agg(
          json_build_object(
            'first_name', ma.first_name,
            'last_name',  ma.last_name,
            'is_corresponding', ma.is_corresponding
          ) ORDER BY ma.author_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'
      ) AS authors
    FROM manuscripts m
    LEFT JOIN categories c ON c.id = m.category_id
    LEFT JOIN manuscript_authors ma ON ma.manuscript_id = m.id
    WHERE m.current_status = 'published'
    GROUP BY m.id, c.name
    ORDER BY m.updated_at DESC
    LIMIT $1
  `, [limit])
  return rows
}


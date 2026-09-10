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
      COALESCE(p.published_at, m.updated_at) AS published_at,
      COALESCE(c.name, 'Research Article') AS category,
      COALESCE(
        json_agg(
          json_build_object(
            'first_name', COALESCE(NULLIF(TRIM(u.first_name), ''), ma.first_name),
            'last_name',  COALESCE(NULLIF(TRIM(u.last_name), ''), ma.last_name),
            'is_corresponding', ma.is_corresponding
          ) ORDER BY ma.author_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'
      ) AS authors
    FROM manuscripts m
    LEFT JOIN categories c ON c.id = m.category_id
    LEFT JOIN manuscript_authors ma ON ma.manuscript_id = m.id
    LEFT JOIN users u ON u.id = ma.user_id
    LEFT JOIN publications p ON p.manuscript_id = m.id
    WHERE m.current_status = 'published'
    GROUP BY m.id, c.name, p.published_at
    ORDER BY COALESCE(p.published_at, m.updated_at) DESC
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
      COALESCE(p.published_at, m.updated_at) AS published_at,
      COALESCE(c.name, 'Research Article') AS category,
      COALESCE(
        json_agg(
          json_build_object(
            'first_name', COALESCE(NULLIF(TRIM(u.first_name), ''), ma.first_name),
            'last_name',  COALESCE(NULLIF(TRIM(u.last_name), ''), ma.last_name),
            'is_corresponding', ma.is_corresponding
          ) ORDER BY ma.author_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'
      ) AS authors
    FROM manuscripts m
    LEFT JOIN categories c ON c.id = m.category_id
    LEFT JOIN manuscript_authors ma ON ma.manuscript_id = m.id
    LEFT JOIN users u ON u.id = ma.user_id
    LEFT JOIN publications p ON p.manuscript_id = m.id
    WHERE m.current_status = 'published'
    GROUP BY m.id, c.name, p.published_at
    ORDER BY COALESCE(p.published_at, m.updated_at) DESC
    LIMIT $1
  `, [limit])
  return rows
}

/**
 * Returns only the authors for one published article. Profile fields are
 * joined from the registered user when available, with manuscript snapshots
 * as a safe historical fallback.
 */
export async function getPublishedArticleAuthors(manuscriptId) {
  const { rows } = await pool.query(`
    SELECT
      ma.id,
      ma.user_id,
      ma.author_order,
      ma.is_corresponding,
      COALESCE(NULLIF(TRIM(u.first_name), ''), ma.first_name) AS first_name,
      COALESCE(NULLIF(TRIM(u.last_name), ''), ma.last_name) AS last_name,
      COALESCE(u.email, ma.email) AS email,
      COALESCE(NULLIF(TRIM(u.institution), ''), ma.institution) AS institution,
      COALESCE(NULLIF(TRIM(u.college), ''), ma.college) AS college,
      COALESCE(NULLIF(TRIM(u.department), ''), ma.department) AS department,
      COALESCE(NULLIF(TRIM(u.state), ''), ma.state) AS state,
      COALESCE(NULLIF(TRIM(u.country), ''), ma.country) AS country,
      COALESCE(NULLIF(TRIM(u.course), ''), ma.course) AS course,
      COALESCE(u.orcid_id, ma.orcid_id) AS orcid_id
    FROM manuscript_authors ma
    JOIN manuscripts m ON m.id = ma.manuscript_id
    LEFT JOIN users u ON u.id = ma.user_id
    WHERE ma.manuscript_id = $1
      AND m.current_status = 'published'
    ORDER BY ma.author_order
  `, [manuscriptId])

  return rows
}

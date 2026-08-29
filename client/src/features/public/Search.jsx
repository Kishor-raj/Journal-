import { useState } from 'react'

const styles = {
  header: {
    backgroundColor: 'var(--color-ink-navy)',
    color: 'var(--color-surface)',
    padding: '4rem 2rem',
    textAlign: 'center',
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  },
  headerSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '1.1rem',
    opacity: 0.8,
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '4rem 2rem',
  },
  searchForm: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '2.5rem',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'var(--font-body)',
    fontSize: '1rem',
    padding: '0.875rem 1.25rem',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '4px',
    color: 'var(--color-ink-black)',
    backgroundColor: 'var(--color-surface)',
    outline: 'none',
  },
  searchButton: {
    fontFamily: 'var(--font-body)',
    fontSize: '1rem',
    fontWeight: 600,
    padding: '0.875rem 1.75rem',
    backgroundColor: 'var(--color-archive-green)',
    color: 'var(--color-surface)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  resultsArea: {
    borderTop: '1px solid var(--color-rule-grey)',
    paddingTop: '2rem',
  },
  resultsTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    color: 'var(--color-ink-navy)',
    marginBottom: '1.5rem',
  },
  placeholder: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    padding: '3rem 0',
    fontStyle: 'italic',
  },
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) {
      setSearched(true)
    }
  }

  return (
    <>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Search</h1>
        <p style={styles.headerSubtitle}>
          Find articles across all published issues
        </p>
      </header>

      <main style={styles.main}>
        <form style={styles.searchForm} onSubmit={handleSubmit}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or keyword..."
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>
            Search
          </button>
        </form>

        <div style={styles.resultsArea}>
          {searched ? (
            <>
              <h2 style={styles.resultsTitle}>Results for &ldquo;{query}&rdquo;</h2>
              <p style={styles.placeholder}>
                Search results will be populated from the database.
              </p>
            </>
          ) : (
            <p style={styles.placeholder}>
              Enter a search term to find articles, authors, and topics.
            </p>
          )}
        </div>
      </main>
    </>
  )
}

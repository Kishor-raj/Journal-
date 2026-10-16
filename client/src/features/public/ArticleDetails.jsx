import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicService } from '../../services/publicService.js'

/* ─── Per-Article PDF Download Rate Limiting ─── */
const RATE_LIMIT_MAX_DOWNLOADS = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute window
const RATE_LIMIT_LOCKOUT_MS = 10 * 60 * 1000 // 10 minutes lockout

function getRateLimitData(articleId) {
  try {
    const raw = localStorage.getItem(`ijidcr_pdf_dl_${articleId}`)
    return raw ? JSON.parse(raw) : { timestamps: [], lockedUntil: null }
  } catch {
    return { timestamps: [], lockedUntil: null }
  }
}

function checkArticleDownloadRateLimit(articleId) {
  try {
    const now = Date.now()
    const data = getRateLimitData(articleId)

    // Check if currently locked
    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingMs = data.lockedUntil - now
      const remainingMin = Math.floor(remainingMs / 60000)
      const remainingSec = Math.ceil((remainingMs % 60000) / 1000)
      return {
        allowed: false,
        locked: true,
        remainingMs,
        remainingMin,
        remainingSec,
        message: `Download limit reached for this article (10 downloads in 1 minute). Downloads locked for ${remainingMin}m ${remainingSec}s.`,
      }
    }

    // Filter timestamps within last 1 minute
    const recent = (data.timestamps || []).filter(t => typeof t === 'number' && now - t < RATE_LIMIT_WINDOW_MS)

    if (recent.length >= RATE_LIMIT_MAX_DOWNLOADS) {
      const lockedUntil = now + RATE_LIMIT_LOCKOUT_MS
      localStorage.setItem(`ijidcr_pdf_dl_${articleId}`, JSON.stringify({
        timestamps: recent,
        lockedUntil,
      }))
      return {
        allowed: false,
        locked: true,
        remainingMs: RATE_LIMIT_LOCKOUT_MS,
        remainingMin: 10,
        remainingSec: 0,
        message: 'Download limit reached for this article (10 downloads in 1 minute). Locked for 10 minutes. Please wait before downloading again.',
      }
    }

    return { allowed: true, recentCount: recent.length }
  } catch {
    return { allowed: true, recentCount: 0 }
  }
}

function recordArticleDownload(articleId) {
  try {
    const now = Date.now()
    const data = getRateLimitData(articleId)
    const recent = (data.timestamps || []).filter(t => typeof t === 'number' && now - t < RATE_LIMIT_WINDOW_MS)
    recent.push(now)

    // If this download hits 10, lock for next 10 minutes
    const lockedUntil = recent.length >= RATE_LIMIT_MAX_DOWNLOADS ? now + RATE_LIMIT_LOCKOUT_MS : null

    localStorage.setItem(`ijidcr_pdf_dl_${articleId}`, JSON.stringify({
      timestamps: recent,
      lockedUntil,
    }))
  } catch (err) {
    console.error('Failed to record rate limit:', err)
  }
}

export default function ArticleDetails() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [unavailableNote, setUnavailableNote] = useState(false)
  const [rateLimitLock, setRateLimitLock] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' })

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 4500)
  }

  // Live rate limit countdown ticker for this article
  useEffect(() => {
    if (!id) return

    function checkLock() {
      const check = checkArticleDownloadRateLimit(id)
      if (!check.allowed && check.locked) {
        setRateLimitLock({
          remainingMin: check.remainingMin,
          remainingSec: check.remainingSec,
        })
      } else {
        setRateLimitLock(null)
      }
    }

    checkLock()
    const interval = setInterval(checkLock, 1000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    let isMounted = true

    async function loadArticle() {
      setLoading(true)
      setError(null)
      try {
        // First try single-article endpoint
        let data = null
        try {
          data = await publicService.getPublishedArticleById(id)
        } catch {
          // Fallback to searching the full published list
          const all = await publicService.getPublishedArticles()
          data = (all || []).find(item => String(item.id) === String(id)) || null
        }

        if (!data) {
          if (isMounted) {
            setError('The requested article was not found or is not publicly available.')
            setLoading(false)
          }
          return
        }

        // Attempt to fetch full author profiles with affiliations
        let authorProfiles = []
        try {
          const authData = await publicService.getPublishedArticleAuthors(id)
          if (Array.isArray(authData) && authData.length > 0) {
            authorProfiles = authData
          }
        } catch {
          // Author profiles optional, fallback to data.authors
        }

        if (isMounted) {
          setArticle(data)
          setAuthors(authorProfiles)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load article:', err)
          setError('Unable to load article details. Please try again later.')
          setLoading(false)
        }
      }
    }

    if (id) {
      loadArticle()
    }

    return () => {
      isMounted = false
    }
  }, [id])

  // Update document title for SEO
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | IJIDCR`
    } else if (error) {
      document.title = 'Article Not Found | IJIDCR'
    } else {
      document.title = 'Article Details | IJIDCR'
    }

    return () => {
      document.title = 'IJIDCR - International Journal of Intelligent Digital Computing Research'
    }
  }, [article, error])

  // Normalize author data from either table
  const formattedAuthors = authors.length > 0
    ? authors.map(a => {
        const fullName = [a.first_name, a.last_name].filter(Boolean).join(' ').trim() || a.name || 'Author'
        const affiliationParts = [a.department, a.college, a.institution, a.state, a.country].filter(Boolean)
        return {
          name: fullName,
          affiliation: affiliationParts.join(', ') || a.institution || a.department || 'Academic Researcher',
          corresponding: Boolean(a.is_corresponding),
          email: a.email || '',
        }
      })
    : (Array.isArray(article?.authors) && article.authors.length > 0)
      ? article.authors.map(a => ({
          name: typeof a === 'string' ? a : ([a.first_name, a.last_name].filter(Boolean).join(' ').trim() || a.name || 'Author'),
          affiliation: a.affiliation || a.institution || a.department || 'Academic Researcher',
          corresponding: Boolean(a.is_corresponding),
          email: a.email || '',
        }))
      : [{ name: 'IJIDCR Contributor', affiliation: 'Academic Researcher', corresponding: false, email: '' }]

  const authorNamesStr = formattedAuthors.map(a => a.name).join(', ')

  // Format date
  const rawDate = article?.published_at || article?.updated_at
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'September 2026'

  const pubYear = article?.publication_year || (rawDate ? new Date(rawDate).getFullYear() : 2026)
  const volumeLabel = article?.volume ? `Volume ${article.volume}` : 'Volume 1'
  const issueLabel = article?.issue ? `Issue ${article.issue}` : 'Issue 1'
  const submissionCode = article?.submission_number || `IJIDCR-26-${String(id).padStart(4, '0')}`

  // Citation string (APA 7th)
  const citationText = `${authorNamesStr} (${pubYear}). ${article?.title || 'Manuscript'}. International Journal of Intelligent Digital Computing Research, ${volumeLabel.replace('Volume ', '')}(${issueLabel.replace('Issue ', '')}), ${submissionCode}.`

  const handleCopyCitation = () => {
    navigator.clipboard?.writeText(citationText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  // Handle PDF Download with 10 downloads/minute -> 10 minutes lockout (per article)
  const handleDownloadPdf = (e) => {
    if (e) e.preventDefault()

    const check = checkArticleDownloadRateLimit(id)
    if (!check.allowed) {
      showToast(check.message, 'warning')
      setRateLimitLock({
        remainingMin: check.remainingMin,
        remainingSec: check.remainingSec,
      })
      return
    }

    // Record this download specifically for this article
    recordArticleDownload(id)

    // Check if this download triggered the 10-minute lockout
    const postCheck = checkArticleDownloadRateLimit(id)
    if (!postCheck.allowed && postCheck.locked) {
      setRateLimitLock({
        remainingMin: postCheck.remainingMin,
        remainingSec: postCheck.remainingSec,
      })
      showToast('Download started! Limit reached (10 downloads in 1 min): downloads for this article are now locked for 10 minutes.', 'warning')
    } else {
      showToast(`Downloading publication PDF [${submissionCode}]...`, 'success')
    }

    // Initiate PDF download
    const a = document.createElement('a')
    a.href = pdfUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.download = article?.original_filename || `${submissionCode}-published.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Keywords list
  const keywordsList = Array.isArray(article?.keywords)
    ? article.keywords
    : typeof article?.keywords === 'string'
      ? article.keywords.split(',').map(s => s.trim()).filter(Boolean)
      : []

  const pdfUrl = article?.download_url || article?.file_url || article?.pdfUrl || null

  return (
    <div style={{ background: '#FDFCF9', minHeight: '80vh', color: '#1C2233', width: '100%', boxSizing: 'border-box' }}>
      {/* ── Top Hero Banner ── */}
      <section
        style={{
          background: '#0B1B3A',
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
          color: '#FFFFFF',
          padding: 'clamp(36px, 5vw, 56px) clamp(16px, 3vw, 24px) clamp(32px, 4vw, 48px)',
          borderBottom: '2px solid #C4A24C',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1060px', margin: '0 auto', width: '100%' }}>
          <Link
            to="/archives"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'Jost, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#C4A24C',
              textDecoration: 'none',
              fontWeight: 600,
              marginBottom: '16px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E3CB86' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#C4A24C' }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: '11px' }} /> Back to Archives
          </Link>
          <div
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '11.5px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#C3CBDC',
              fontWeight: 500,
            }}
          >
            {volumeLabel} ({pubYear}) · {issueLabel} · Peer-Reviewed &amp; Open Access
          </div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <main
        style={{
          maxWidth: '1060px',
          margin: '0 auto',
          padding: 'clamp(28px, 4vw, 44px) clamp(16px, 3vw, 24px) clamp(48px, 6vw, 80px)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Loading State */}
        {loading && (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              fontFamily: 'Jost, sans-serif',
              color: '#6B7288',
              fontSize: '15px',
              background: '#FFFFFF',
              border: '1px solid #E6E1D6',
            }}
          >
            <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '10px', color: '#C4A24C' }} />
            Loading article details…
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div
            style={{
              padding: '48px 28px',
              textAlign: 'center',
              background: '#FFFFFF',
              border: '1px solid #E6E1D6',
              borderLeft: '4px solid #B4552D',
              boxShadow: '0 4px 18px rgba(11,27,58,0.03)',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '26px',
                color: '#0B1B3A',
                margin: '0 0 10px',
              }}
            >
              Article Not Found
            </h2>
            <p style={{ color: '#6B7288', fontSize: '14.5px', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              {error}
            </p>
            <Link
              to="/archives"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'Jost, sans-serif',
                fontSize: '12.5px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: '#0B1B3A',
                color: '#FFFFFF',
                padding: '10px 22px',
                borderRadius: '2px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              ← Return to Archives
            </Link>
          </div>
        )}

        {/* Article Details Paper */}
        {!loading && !error && article && (
          <article
            style={{
              background: '#FFFFFF',
              border: '1px solid #E6E1D6',
              boxShadow: '0 6px 24px rgba(11,27,58,0.04)',
              padding: 'clamp(24px, 5vw, 52px)',
              boxSizing: 'border-box',
              width: '100%',
            }}
          >
            {/* Top Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  background: '#FFFDF5',
                  border: '1px solid #C4A24C',
                  color: '#9A7B23',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: '2px',
                }}
              >
                {article.category || 'Research Article'}
              </span>
              <span
                style={{
                  background: '#EAF6EE',
                  color: '#2B7A4B',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: '2px',
                }}
              >
                Published · Open Access
              </span>
            </div>

            {/* Article Title */}
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 'clamp(26px, 3.8vw, 38px)',
                fontWeight: 600,
                color: '#0B1B3A',
                lineHeight: 1.25,
                margin: '0 0 16px',
              }}
            >
              {article.title}
            </h1>

            {/* Authors Byline */}
            <div
              style={{
                fontSize: '16px',
                color: '#3A4157',
                fontStyle: 'italic',
                marginBottom: '6px',
                lineHeight: 1.5,
              }}
            >
              {authorNamesStr}
            </div>

            {/* Metadata Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                margin: '24px 0 32px',
                background: '#F8F9FB',
                border: '1px solid #EFECE6',
                padding: '16px 20px',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '10.5px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#6B7288',
                    display: 'block',
                    marginBottom: '3px',
                  }}
                >
                  Article Code
                </span>
                <strong style={{ color: '#0B1B3A', fontSize: '13.5px', fontFamily: 'Jost, sans-serif' }}>
                  {submissionCode}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '10.5px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#6B7288',
                    display: 'block',
                    marginBottom: '3px',
                  }}
                >
                  Published Date
                </span>
                <strong style={{ color: '#0B1B3A', fontSize: '13.5px', fontFamily: 'Jost, sans-serif' }}>
                  {formattedDate}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '10.5px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#6B7288',
                    display: 'block',
                    marginBottom: '3px',
                  }}
                >
                  Issue Location
                </span>
                <strong style={{ color: '#0B1B3A', fontSize: '13.5px', fontFamily: 'Jost, sans-serif' }}>
                  {volumeLabel} · {issueLabel} ({pubYear})
                </strong>
              </div>
            </div>

            {/* Section: Authors and Affiliations */}
            <section
              style={{
                paddingTop: '24px',
                marginTop: '24px',
                borderTop: '1px solid #EFECE6',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#0B1B3A',
                  margin: '0 0 14px',
                }}
              >
                Authors &amp; Affiliations
              </h2>
              <div style={{ display: 'grid', gap: '14px' }}>
                {formattedAuthors.map((author, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px 16px',
                      background: '#FFFFFF',
                      border: '1px solid #EFECE6',
                      borderLeft: author.corresponding ? '3px solid #C4A24C' : '1px solid #EFECE6',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#0B1B3A', fontSize: '14.5px' }}>{author.name}</strong>
                      {author.corresponding && (
                        <span
                          style={{
                            background: '#FFFDF5',
                            border: '1px solid #C4A24C',
                            color: '#9A7B23',
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            padding: '1px 6px',
                            borderRadius: '2px',
                          }}
                        >
                          <i className="fa-solid fa-envelope" style={{ fontSize: '8.5px', marginRight: '4px' }} />
                          Corresponding Author
                        </span>
                      )}
                    </div>
                    {author.affiliation && (
                      <div style={{ fontSize: '13.5px', color: '#6B7288', marginTop: '4px', lineHeight: 1.5 }}>
                        {author.affiliation}
                      </div>
                    )}
                    {author.email && (
                      <div style={{ fontSize: '12.5px', color: '#9A7B23', marginTop: '3px' }}>
                        {author.email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Section: Abstract */}
            <section
              style={{
                paddingTop: '24px',
                marginTop: '24px',
                borderTop: '1px solid #EFECE6',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#0B1B3A',
                  margin: '0 0 12px',
                }}
              >
                Abstract
              </h2>
              <div
                style={{
                  background: '#F8F9FB',
                  borderLeft: '3px solid #C4A24C',
                  padding: '18px 22px',
                  fontSize: '15px',
                  lineHeight: 1.75,
                  color: '#3A4157',
                }}
              >
                {article.abstract || 'No structured abstract available for this manuscript.'}
              </div>
            </section>

            {/* Section: Keywords */}
            {keywordsList.length > 0 && (
              <section
                style={{
                  paddingTop: '24px',
                  marginTop: '24px',
                  borderTop: '1px solid #EFECE6',
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: '22px',
                    fontWeight: 600,
                    color: '#0B1B3A',
                    margin: '0 0 12px',
                  }}
                >
                  Keywords
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {keywordsList.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E6E1D6',
                        color: '#3A4157',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '13px',
                        padding: '5px 12px',
                        borderRadius: '2px',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Section: How to Cite */}
            <section
              style={{
                paddingTop: '24px',
                marginTop: '24px',
                borderTop: '1px solid #EFECE6',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: '22px',
                    fontWeight: 600,
                    color: '#0B1B3A',
                    margin: 0,
                  }}
                >
                  How to Cite (APA 7th)
                </h2>
                <button
                  type="button"
                  onClick={handleCopyCitation}
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11.5px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    background: '#0B1B3A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.15s',
                  }}
                >
                  <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} />
                  {copied ? 'Copied' : 'Copy Citation'}
                </button>
              </div>
              <div
                style={{
                  background: '#F8F9FB',
                  border: '1px solid #EFECE6',
                  padding: '14px 18px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#1C2233',
                  fontStyle: 'italic',
                }}
              >
                {citationText}
              </div>
            </section>

            {/* Section: Download Action Footer */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '2px solid #EFECE6',
              }}
            >
              <div>
                {pdfUrl ? (
                  <div>
                    {rateLimitLock ? (
                      <div>
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          style={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '13px',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            background: '#FFF2EE',
                            color: '#B4552D',
                            border: '1px solid #E8B4A4',
                            padding: '11px 24px',
                            borderRadius: '2px',
                            cursor: 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fa-solid fa-lock" />
                          Download Locked ({rateLimitLock.remainingMin}m {rateLimitLock.remainingSec}s)
                        </button>
                        <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#B4552D', fontFamily: 'Jost, sans-serif', maxWidth: '440px', lineHeight: 1.45 }}>
                          Rate limit reached: Maximum 10 downloads per minute allowed for this article. Download is locked for {rateLimitLock.remainingMin}m {rateLimitLock.remainingSec}s.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '13px',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          background: '#C4A24C',
                          color: '#071228',
                          border: 'none',
                          padding: '11px 24px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#E3CB86' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#C4A24C' }}
                      >
                        <i className="fa-solid fa-file-pdf" style={{ fontSize: '15px' }} />
                        Download PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setUnavailableNote(true)}
                      style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '13px',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        background: '#F4F5F8',
                        color: '#6B7288',
                        border: '1px solid #E6E1D6',
                        padding: '11px 24px',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <i className="fa-solid fa-file-pdf" style={{ fontSize: '15px' }} />
                      Download PDF (Unavailable)
                    </button>
                    {unavailableNote && (
                      <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#9A7B23', fontFamily: 'Jost, sans-serif' }}>
                        The official publication PDF is currently being prepared for this article. Please check back shortly.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Link
                to="/archives"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0B1B3A',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ← Return to Archives
              </Link>
            </div>
          </article>
        )}
      </main>

      {/* ── Toast Notification ── */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'warning' ? '#4A1D0B' : '#071228',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderLeft: `3px solid ${toast.type === 'warning' ? '#E67E22' : '#C4A24C'}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            fontFamily: 'Jost, sans-serif',
            fontSize: '13px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '420px',
            lineHeight: 1.5,
          }}
        >
          <i
            className={
              toast.type === 'warning'
                ? 'fa-solid fa-triangle-exclamation'
                : 'fa-solid fa-circle-check'
            }
            style={{ color: toast.type === 'warning' ? '#E67E22' : '#C4A24C', fontSize: '15px' }}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

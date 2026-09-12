import { useState, useEffect, useMemo } from 'react'
import { publicService } from '../../services/publicService.js'
import { triggerPdfDownload } from '../../utils/pdfGenerator.js'

/* ─── Rate Limiting Constants (Background Protection) ─── */
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute (60 seconds)

/**
 * Checks and records user actions (view / download) in the background.
 * Rule: Maximum 3 actions per 1 minute window.
 */
function checkRateLimit() {
  try {
    const now = Date.now()
    const stored = JSON.parse(localStorage.getItem('ijidcr_user_action_timestamps') || '[]')
    // Keep only timestamps within the last 60 seconds
    const recent = stored.filter(t => typeof t === 'number' && now - t < RATE_LIMIT_WINDOW_MS)

    if (recent.length >= RATE_LIMIT_MAX) {
      const oldest = Math.min(...recent)
      const remainingSeconds = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000))
      return {
        allowed: false,
        remainingSeconds,
        message: `Rate limit reached: Maximum 3 views/downloads per minute allowed to protect server resources. Please wait ${remainingSeconds}s.`,
      }
    }

    recent.push(now)
    localStorage.setItem('ijidcr_user_action_timestamps', JSON.stringify(recent))
    return { allowed: true }
  } catch {
    return { allowed: true }
  }
}

/* ─── Default 2026 Volume 1 Issue 1 Archive Collection ─── */
const INITIAL_ARCHIVE_DATA = [
  {
    id: 'vol-1',
    title: 'Volume 1 (2026)',
    year: 2026,
    meta: 'Current Volume · Issue 1 Available',
    issues: [
      {
        id: 'vol-1-iss-1',
        name: 'Issue 1 (2026)',
        tag: 'Volume 1 Issue 1 · Published · Open Access',
        articles: [
          {
            id: 'art-101',
            title: 'cyberdude: Multi-Agent Neural Synthesis and Distributed Cognitive Workflows in Scaled Enterprise Systems',
            category: 'Case Study',
            code: 'IJIDCR-26-0002',
            date: 'September 11, 2026',
            status: 'Published · Open Access',
            abstract: 'This paper presents a formal analysis and verification framework for multi-round reviewer cycles, automated editorial workflows, and distributed agentic synthesis. We detail comprehensive performance metrics and validation proofs across multiple stress environments.',
            keywords: 'AI, Distributed Systems, Multi-Round Review, Agentic Workflows',
            authors: [
              { name: 'Eswar A.', corresponding: true, affiliation: 'Department of Computing, Asgard Research Institute' },
              { name: 'Eswaran A.', corresponding: false, affiliation: 'Department of Computer Science & Engineering' },
            ],
            pdfUrl: '',
          },
          {
            id: 'art-102',
            title: 'Optimized Vision-Language Models for Real-time Edge Diagnostics in Medical Imaging',
            category: 'Research Article',
            code: 'IJIDCR-26-0003',
            date: 'September 08, 2026',
            status: 'Published · Open Access',
            abstract: 'Edge-native quantized multimodal transformers achieve 94.2% diagnostic accuracy on distributed radiology cohorts with latency under 12ms per frame.',
            keywords: 'Computer Vision, Edge Computing, Medical Diagnostics, Transformers',
            authors: [
              { name: 'Dr. Sarah Jenkins', corresponding: true, affiliation: 'Institute of Biomedical Computing, Zurich' },
              { name: 'Prof. Michael Chang', corresponding: false, affiliation: 'Centre for Intelligent Systems, MIT' },
              { name: 'Kavitha R.', corresponding: false, affiliation: 'Department of Electrical Engineering' },
            ],
            pdfUrl: '',
          },
          {
            id: 'art-103',
            title: 'Cryptographic Integrity Verification in Decentralized Academic Repositories',
            category: 'Review Article',
            code: 'IJIDCR-26-0004',
            date: 'September 02, 2026',
            status: 'Published · Open Access',
            abstract: 'A comprehensive survey of zero-knowledge proofs, merkle-dag hashing structures, and decentralized identifier standards for tamper-proof peer review trails.',
            keywords: 'Cryptography, Zero-Knowledge Proofs, Data Integrity, Blockchain',
            authors: [
              { name: 'Alexander Wright', corresponding: true, affiliation: 'Oxford Cryptography Lab' },
              { name: 'Elena Rostova', corresponding: false, affiliation: 'Cybersecurity Department, TU Munich' },
            ],
            pdfUrl: '',
          },
          {
            id: 'art-104',
            title: 'Adaptive Resource Scheduling in Green Cloud Data Centers using Deep Reinforcement Learning',
            category: 'Research Article',
            code: 'IJIDCR-26-0005',
            date: 'August 28, 2026',
            status: 'Published · Open Access',
            abstract: 'We propose EcoSched, an asynchronous policy-gradient resource manager that reduces energy footprints across hyperscale server clusters by 28.4%.',
            keywords: 'Green Cloud, Reinforcement Learning, Energy Efficiency, Cloud Computing',
            authors: [
              { name: 'Dr. Tariq Al-Mansoor', corresponding: true, affiliation: 'School of Sustainable Tech, Dubai' },
              { name: 'Hannah Schmidt', corresponding: false, affiliation: 'Sustainable Computing Lab, Berlin' },
            ],
            pdfUrl: '',
          },
          {
            id: 'art-105',
            title: 'Robust Cyber-Physical Security for Distributed Smart Power Grids',
            category: 'Methodology',
            code: 'IJIDCR-26-0006',
            date: 'August 20, 2026',
            status: 'Published · Open Access',
            abstract: 'An anomaly detection architecture combining graph neural networks and spatial-temporal state estimation for smart grid resilience against advanced persistent threats.',
            keywords: 'Smart Grid, Graph Neural Networks, Cyber-Physical Security, Resilience',
            authors: [
              { name: 'Prof. Daniel Evans', corresponding: true, affiliation: 'Smart Energy Institute, London' },
              { name: 'Priya Sharma', corresponding: false, affiliation: 'Department of Electrical Engineering, IIT' },
            ],
            pdfUrl: '',
          },
        ],
      },
    ],
  },
]

export default function Archives() {
  const [archiveData, setArchiveData] = useState(INITIAL_ARCHIVE_DATA)
  const [searchQuery, setSearchQuery] = useState('')
  const [openIssues, setOpenIssues] = useState({ 'vol-1-iss-1': true })
  const [expandedAbstracts, setExpandedAbstracts] = useState({})
  const [activeModalArticle, setActiveModalArticle] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' })
  const [loading, setLoading] = useState(true)

  // Show Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 3800)
  }

  // Fetch real published manuscripts from database on mount
  useEffect(() => {
    let isMounted = true

    async function fetchPublishedData() {
      try {
        const liveArticles = await publicService.getPublishedArticles()
        if (isMounted && Array.isArray(liveArticles) && liveArticles.length > 0) {
          // Map real original articles from DB
          const formatted = liveArticles.map(m => {
            const rawDate = m.published_at || m.updated_at
            const formattedDate = rawDate
              ? new Date(rawDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'September 2026'

            const authorsList = (Array.isArray(m.authors) && m.authors.length > 0)
              ? m.authors.map(a => ({
                  name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Author',
                  corresponding: Boolean(a.is_corresponding),
                  affiliation: a.institution || a.department || 'Academic Researcher',
                }))
              : [{ name: 'Editorial Author', corresponding: true, affiliation: 'IJIDCR Editorial Board' }]

            return {
              id: String(m.id),
              title: m.title || 'Untitled Manuscript',
              category: m.category || 'Research Article',
              code: m.submission_number || 'IJIDCR-26-0001',
              date: formattedDate,
              status: 'Published · Open Access',
              abstract: m.abstract || 'No structured abstract available for this manuscript.',
              keywords: Array.isArray(m.keywords) ? m.keywords.join(', ') : (m.keywords || 'Computing, Artificial Intelligence, Digital Systems'),
              authors: authorsList,
              pdfUrl: m.download_url || m.file_url || m.pdf_url || '',
              viewUrl: m.view_url || '',
              originalFilename: m.original_filename || '',
            }
          })

          // Deduplicate by ID
          const uniqueArticles = Array.from(
            new Map(formatted.map(item => [item.id, item])).values()
          )

          setArchiveData(prev => {
            const next = JSON.parse(JSON.stringify(prev))
            const v1i1 = next[0].issues[0]
            v1i1.articles = uniqueArticles
            return next
          })
        }
      } catch (err) {
        console.warn('Using initial archive dataset:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPublishedData()
    return () => { isMounted = false }
  }, [])

  // Toggle issue panel accordion
  const toggleIssue = (issueId) => {
    setOpenIssues(prev => ({
      ...prev,
      [issueId]: !prev[issueId],
    }))
  }

  // Toggle abstract expansion
  const toggleAbstract = (articleId) => {
    setExpandedAbstracts(prev => ({
      ...prev,
      [articleId]: !prev[articleId],
    }))
  }

  // Handle View Article action with Rate Limiting logic
  const handleViewArticle = (art, volTitle, issueName) => {
    const rateCheck = checkRateLimit()
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'warning')
      return
    }

    setActiveModalArticle({
      ...art,
      volTitle,
      issueName,
    })
  }

  // Handle Download Manuscript (Direct Original File or Generated PDF)
  const handleDownloadPdf = (art, volTitle = 'Volume 1 (2026)', issueName = 'Issue 1 (2026)') => {
    const rateCheck = checkRateLimit()
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'warning')
      return
    }

    const code = art.code || 'IJIDCR-26'
    showToast(`Downloading original manuscript [${code}]...`, 'success')

    try {
      // If the article has an original uploaded file on Cloudinary / server
      if (art.pdfUrl && art.pdfUrl.startsWith('http')) {
        const a = document.createElement('a')
        a.href = art.pdfUrl
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.download = art.originalFilename || `${code}-manuscript.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        // Fallback: Generate compliant, valid academic PDF
        triggerPdfDownload({
          title: art.title,
          code: art.code,
          date: art.date,
          category: art.category,
          authors: art.authors,
          abstract: art.abstract,
          keywords: art.keywords,
          volTitle,
          issueName,
        }, `${code}-manuscript.pdf`)
      }
    } catch (err) {
      console.error('Manuscript download error:', err)
      showToast('Error downloading manuscript. Please try again.', 'warning')
    }
  }

  // Copy APA Citation helper
  const handleCopyCitation = (art) => {
    const authorsStr = (art.authors || []).map(a => a.name || a).join(', ')
    const citation = `${authorsStr} (2026). ${art.title}. International Journal of Intelligent Digital Computing Research, 1(1), ${art.code}.`
    navigator.clipboard?.writeText(citation)
    showToast('Citation copied to clipboard!', 'success')
  }

  // Filtered Archive by Search query
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return archiveData

    return archiveData.map(vol => {
      const matchingIssues = vol.issues.map(iss => {
        const matchingArticles = iss.articles.filter(art => {
          const matchTitle = (art.title || '').toLowerCase().includes(q)
          const matchCode = (art.code || '').toLowerCase().includes(q)
          const matchKeywords = (art.keywords || '').toLowerCase().includes(q)
          const matchCategory = (art.category || '').toLowerCase().includes(q)
          const matchAuthors = (art.authors || []).some(a => (a.name || '').toLowerCase().includes(q))
          return matchTitle || matchCode || matchKeywords || matchCategory || matchAuthors
        })
        return { ...iss, articles: matchingArticles }
      }).filter(iss => iss.articles.length > 0 || iss.name.toLowerCase().includes(q))

      if (matchingIssues.length > 0 || vol.title.toLowerCase().includes(q)) {
        return { ...vol, issues: matchingIssues.length > 0 ? matchingIssues : vol.issues }
      }
      return null
    }).filter(Boolean)
  }, [archiveData, searchQuery])

  return (
    <div style={{ background: '#FDFCF9', minHeight: '100%', color: '#1C2233', width: '100%' }}>
      {/* ── Page Hero ── */}
      <section
        style={{
          background: '#0B1B3A',
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
          color: '#FFFFFF',
          padding: 'clamp(44px, 6vw, 68px) clamp(16px, 3vw, 24px) clamp(40px, 5vw, 60px)',
          borderBottom: '2px solid #C4A24C',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
          <div
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '11.5px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#C4A24C',
              marginBottom: '10px',
              fontWeight: 600,
            }}
          >
            2026 Archive Collection · Volume 1
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(28px, 4.4vw, 44px)',
              fontWeight: 600,
              lineHeight: 1.15,
              margin: '0 0 10px',
            }}
          >
            Journal Archives
          </h1>
          <p
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontSize: 'clamp(15px, 1.4vw, 17px)',
              color: '#C3CBDC',
              maxWidth: '680px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Explore our catalog of open-access published volumes, peer-reviewed issues, and scholarly articles.
          </p>
        </div>
      </section>

      {/* ── Main Container ── */}
      <main
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: 'clamp(28px, 4vw, 44px) clamp(16px, 3vw, 24px) clamp(40px, 5vw, 64px)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        
        {/* Search & Filter Bar */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'stretch',
            marginBottom: '28px',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <div style={{ flex: '1 1 260px', position: 'relative', minWidth: '240px' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6B7288',
                fontSize: '14px',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, keyword, code..."
              style={{
                width: '100%',
                padding: '13px 16px 13px 44px',
                border: '1px solid #E6E1D6',
                background: '#FFFFFF',
                fontSize: '15px',
                color: '#1C2233',
                outline: 'none',
                fontFamily: 'Jost, sans-serif',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#C4A24C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E6E1D6' }}
            />
          </div>
          <button
            type="button"
            onClick={() => {}}
            style={{
              background: '#0B1B3A',
              color: '#FFFFFF',
              fontFamily: 'Jost, sans-serif',
              fontSize: '13px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
              padding: '0 24px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.15s',
              height: '46px',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#071228' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0B1B3A' }}
          >
            <i className="fa-solid fa-filter" /> Filter
          </button>
        </div>

        {/* Volume Cards Listing */}
        {filteredData.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              background: '#FFFFFF',
              border: '1px solid #E6E1D6',
              color: '#6B7288',
              fontStyle: 'italic',
              fontSize: '15px',
            }}
          >
            No archive records found matching "{searchQuery}". Try searching by another keyword.
          </div>
        ) : (
          filteredData.map(vol => {
            const hasAnyOpen = vol.issues.some(issue => openIssues[issue.id])

            return (
              <div
                key={vol.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E6E1D6',
                  marginBottom: '20px',
                  width: '100%',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                {/* Volume Header (Clean & Clickable) */}
                <div
                  style={{
                    padding: 'clamp(18px, 2.5vw, 24px) clamp(16px, 3vw, 28px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                    background: hasAnyOpen ? '#F8F9FB' : '#FFFFFF',
                    borderBottom: hasAnyOpen ? '1px solid #EFECE6' : 'none',
                    transition: 'background 0.2s, border-bottom 0.2s',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 'clamp(22px, 2.6vw, 26px)',
                        fontWeight: 600,
                        color: '#0B1B3A',
                        margin: '0 0 3px',
                        lineHeight: 1.2,
                      }}
                    >
                      {vol.title}
                    </h2>
                    <div
                      style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '11.5px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#6B7288',
                        fontWeight: 500,
                      }}
                    >
                      {vol.meta}
                    </div>
                  </div>

                  {/* Issue Trigger Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {vol.issues.map(issue => {
                      const isOpen = Boolean(openIssues[issue.id])
                      return (
                        <button
                          key={issue.id}
                          type="button"
                          onClick={() => toggleIssue(issue.id)}
                          style={{
                            background: isOpen ? '#0B1B3A' : '#FDFCF9',
                            border: `1px solid ${isOpen ? '#0B1B3A' : '#E6E1D6'}`,
                            color: isOpen ? '#FFFFFF' : '#0B1B3A',
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '12.5px',
                            letterSpacing: '0.04em',
                            fontWeight: 500,
                            padding: '8px 16px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: '2px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{issue.name}</span>
                          <i
                            className="fa-solid fa-chevron-down"
                            style={{
                              fontSize: '10px',
                              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Issue Dropdown Panels */}
                {vol.issues.map(issue => {
                  const isOpen = Boolean(openIssues[issue.id])
                  if (!isOpen) return null

                  return (
                    <div
                      key={issue.id}
                      style={{
                        padding: '8px clamp(16px, 3vw, 28px) 20px',
                        background: '#FFFFFF',
                        boxSizing: 'border-box',
                        width: '100%',
                      }}
                    >
                      {/* Issue Tag Header Bar */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 0 10px',
                          borderBottom: '1px solid #E6E1D6',
                          marginBottom: '8px',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '11.5px',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            color: '#9A7B23',
                          }}
                        >
                          {issue.tag}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '11.5px',
                            color: '#6B7288',
                          }}
                        >
                          {issue.articles.length} peer-reviewed articles
                        </span>
                      </div>

                      {/* Articles List */}
                      <div style={{ display: 'grid' }}>
                        {issue.articles.map((art, idx) => {
                          const isAbstractOpen = Boolean(expandedAbstracts[art.id])
                          const isLast = idx === issue.articles.length - 1

                          return (
                            <article
                              key={art.id}
                              style={{
                                padding: '18px 0',
                                borderBottom: isLast ? 'none' : '1px solid #EFECE6',
                                width: '100%',
                                boxSizing: 'border-box',
                              }}
                            >
                              {/* Top metadata line */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '8px 12px',
                                  flexWrap: 'wrap',
                                  marginBottom: '6px',
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '11px',
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    color: '#9A7B23',
                                  }}
                                >
                                  {art.category}
                                </span>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '11.5px',
                                    color: '#6B7288',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <span>{art.code}</span>
                                  <span>·</span>
                                  <span>{art.date}</span>
                                  <span
                                    style={{
                                      background: '#EAF6EE',
                                      color: '#2B7A4B',
                                      fontWeight: 600,
                                      padding: '1px 7px',
                                      borderRadius: '2px',
                                      fontSize: '10.5px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em',
                                    }}
                                  >
                                    {art.status}
                                  </span>
                                </div>
                              </div>

                              {/* Title */}
                              <h3
                                onClick={() => handleViewArticle(art, vol.title, issue.name)}
                                style={{
                                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                                  fontSize: 'clamp(19px, 2.2vw, 22px)',
                                  fontWeight: 600,
                                  color: '#0B1B3A',
                                  lineHeight: 1.3,
                                  margin: '0 0 8px',
                                  cursor: 'pointer',
                                  transition: 'color 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#9A7B23' }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#0B1B3A' }}
                              >
                                {art.title}
                              </h3>

                              {/* Authors */}
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '6px 8px',
                                  alignItems: 'center',
                                  marginBottom: '10px',
                                  fontSize: '14.5px',
                                  color: '#3A4157',
                                }}
                              >
                                {(art.authors || []).map((a, aIdx) => (
                                  <span key={aIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontStyle: 'italic', color: '#1C2233' }}>{a.name || a}</span>
                                    {a.corresponding && (
                                      <span
                                        style={{
                                          background: '#FFFDF5',
                                          border: '1px solid #C4A24C',
                                          color: '#9A7B23',
                                          fontFamily: 'Jost, sans-serif',
                                          fontSize: '10px',
                                          fontWeight: 600,
                                          letterSpacing: '0.05em',
                                          textTransform: 'uppercase',
                                          padding: '1px 5px',
                                          borderRadius: '2px',
                                          fontStyle: 'normal',
                                        }}
                                      >
                                        <i className="fa-solid fa-envelope" style={{ fontSize: '8.5px', marginRight: '3px' }} />
                                        Corresponding
                                      </span>
                                    )}
                                    {aIdx < (art.authors || []).length - 1 && <span style={{ color: '#C9CEDC' }}>·</span>}
                                  </span>
                                ))}
                              </div>

                              {/* Abstract Accordion Toggle */}
                              <button
                                type="button"
                                onClick={() => toggleAbstract(art.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#9A7B23',
                                  fontSize: '12px',
                                  fontFamily: 'Jost, sans-serif',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  textUnderlineOffset: '3px',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  marginBottom: '10px',
                                }}
                              >
                                <i className="fa-solid fa-file-lines" />
                                <span>{isAbstractOpen ? 'Hide Abstract' : 'Show Abstract & Keywords'}</span>
                              </button>

                              {/* Structured Abstract Panel */}
                              {isAbstractOpen && (
                                <div
                                  style={{
                                    fontSize: '14px',
                                    color: '#3A4157',
                                    lineHeight: 1.6,
                                    background: '#F8F9FB',
                                    borderLeft: '3px solid #C4A24C',
                                    padding: '12px 16px',
                                    margin: '6px 0 14px',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <p style={{ margin: '0 0 6px' }}>
                                    <strong style={{ color: '#0B1B3A' }}>Abstract:</strong> {art.abstract}
                                  </p>
                                  <p style={{ fontSize: '13px', color: '#6B7288', margin: 0 }}>
                                    <strong style={{ color: '#0B1B3A' }}>Keywords:</strong> {art.keywords}
                                  </p>
                                </div>
                              )}

                              {/* Action Buttons: View & Download */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  flexWrap: 'wrap',
                                  marginTop: '6px',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleViewArticle(art, vol.title, issue.name)}
                                  style={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '12px',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    padding: '7px 16px',
                                    border: '1px solid #0B1B3A',
                                    background: '#0B1B3A',
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    borderRadius: '2px',
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#182C54'; e.currentTarget.style.borderColor = '#182C54' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#0B1B3A'; e.currentTarget.style.borderColor = '#0B1B3A' }}
                                >
                                  <i className="fa-regular fa-eye" /> View Article
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadPdf(art, vol.title, issue.name)}
                                  style={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '12px',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    padding: '7px 16px',
                                    border: '1px solid #E6E1D6',
                                    background: '#FFFFFF',
                                    color: '#0B1B3A',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    borderRadius: '2px',
                                    transition: 'all 0.15s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#FFFDF5'; e.currentTarget.style.borderColor = '#C4A24C'; e.currentTarget.style.color = '#9A7B23' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E6E1D6'; e.currentTarget.style.color = '#0B1B3A' }}
                                >
                                  <i className="fa-solid fa-download" /> Download Manuscript
                                </button>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </main>

      {/* ── View Article Modal ── */}
      {activeModalArticle && (
        <div
          onClick={() => setActiveModalArticle(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 27, 58, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '740px',
              maxHeight: '86vh',
              overflowY: 'auto',
              border: '1px solid #E6E1D6',
              boxShadow: '0 16px 40px rgba(11, 27, 58, 0.25)',
              position: 'relative',
              padding: 'clamp(20px, 3.5vw, 36px)',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalArticle(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                color: '#6B7288',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
              aria-label="Close modal"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Modal Top Metadata */}
            <div
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#9A7B23',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              {activeModalArticle.volTitle} · {activeModalArticle.issueName} · {activeModalArticle.category}
            </div>

            {/* Modal Title */}
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 'clamp(22px, 2.8vw, 26px)',
                fontWeight: 600,
                color: '#0B1B3A',
                marginBottom: '14px',
                lineHeight: 1.25,
              }}
            >
              {activeModalArticle.title}
            </h2>

            {/* Authors & Affiliations */}
            <div
              style={{
                marginBottom: '16px',
                paddingBottom: '14px',
                borderBottom: '1px solid #E6E1D6',
              }}
            >
              <div
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#6B7288',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                Authors &amp; Institutional Affiliation:
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {(activeModalArticle.authors || []).map((a, idx) => (
                  <div key={idx} style={{ fontSize: '14.5px', color: '#1C2233', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600 }}>
                      {a.name || a}
                      {a.corresponding && (
                        <span
                          style={{
                            background: '#FFFDF5',
                            border: '1px solid #C4A24C',
                            color: '#9A7B23',
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            padding: '1px 5px',
                            borderRadius: '2px',
                            marginLeft: '6px',
                          }}
                        >
                          Corresponding Author
                        </span>
                      )}
                    </div>
                    {a.affiliation && (
                      <div style={{ fontSize: '13px', color: '#6B7288' }}>
                        {a.affiliation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Structured Abstract */}
            <div style={{ marginBottom: '16px' }}>
              <h4
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#0B1B3A',
                  margin: '0 0 6px',
                }}
              >
                Structured Abstract
              </h4>
              <div
                style={{
                  background: '#F8F9FB',
                  borderLeft: '3px solid #C4A24C',
                  padding: '14px 16px',
                  fontSize: '14.5px',
                  color: '#3A4157',
                  lineHeight: 1.65,
                }}
              >
                {activeModalArticle.abstract}
              </div>
            </div>

            {/* Keywords */}
            <div
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '13px',
                marginBottom: '22px',
                color: '#3A4157',
              }}
            >
              <strong style={{ color: '#0B1B3A' }}>Keywords:</strong> {activeModalArticle.keywords}
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleDownloadPdf(activeModalArticle, activeModalArticle.volTitle, activeModalArticle.issueName)}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  padding: '9px 18px',
                  background: '#0B1B3A',
                  color: '#FFFFFF',
                  border: '1px solid #0B1B3A',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '2px',
                }}
              >
                <i className="fa-solid fa-file-pdf" /> Download Manuscript
              </button>

              <button
                type="button"
                onClick={() => handleCopyCitation(activeModalArticle)}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  padding: '9px 18px',
                  background: '#FFFFFF',
                  color: '#0B1B3A',
                  border: '1px solid #E6E1D6',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '2px',
                }}
              >
                <i className="fa-regular fa-copy" /> Copy Citation (APA)
              </button>
            </div>
          </div>
        </div>
      )}

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
            maxWidth: '400px',
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

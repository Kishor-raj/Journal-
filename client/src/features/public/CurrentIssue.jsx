import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { publicService } from '../../services/publicService.js'

/* ─── Static journal info (keep as-is, only articles come from DB) ─── */
const JOURNAL_INFO = {
  name: 'International Journal of Intelligent Digital Computing Research (IJIDCR)',
  shortName: 'IJIDCR',
  volume: 'Volume 1',
  issue: 'Issue 1',
  year: '2026',
  frequency: 'Quarterly',
  issnOnline: '2977-4418',
  issnPrint: 'To be Assigned',
  doiPrefix: '10.xxxx/ijidcr.2026',
  status: 'Published · Open Access',
}

const HIGHLIGHTS = [
  'Rigorous Double-Blind Peer Review',
  'Original Research & Review Contributions',
  'Multidisciplinary Computing Scope',
  'Strict Publication Ethics Compliance',
  'Immediate Open Access Distribution',
]

/** Shape raw API manuscript into the format ArticleItem expects */
function toArticle(m, idx) {
  const authorsStr = (m.authors || [])
    .map(a => `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim())
    .filter(Boolean)
    .join(', ')

  // Build APA-style citation
  const yearStr = m.updated_at ? new Date(m.updated_at).getFullYear() : JOURNAL_INFO.year
  const citation = `${authorsStr} (${yearStr}). ${m.title}. ${JOURNAL_INFO.shortName}, ${JOURNAL_INFO.volume.replace('Volume ', '')}(${JOURNAL_INFO.issue.replace('Issue ', '')}). ${m.submission_number || ''}`

  return {
    id: m.id,
    tag: m.category || 'Research Article',
    title: m.title || '(Untitled)',
    authors: authorsStr || 'Unknown author',
    affiliation: '',
    abstract: m.abstract || '',
    keywords: (m.keywords || []).join(', '),
    pages: m.submission_number || `Article ${idx + 1}`,
    doi: '',
    status: 'Published',
    citation,
  }
}

/* ─── ActionButton ─────────────────────────────────────────────────────── */
function ActionButton({ children, onClick, active }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? 'rgba(196,162,76,0.15)' : 'none',
        border: 'none',
        borderBottom: `1px solid ${hovered || active ? '#C4A24C' : 'transparent'}`,
        color: hovered || active ? '#9A7B23' : '#0B1B3A',
        fontFamily: 'Jost, sans-serif',
        fontSize: '12.5px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        fontWeight: 600,
        padding: '3px 5px',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

/* ─── ArticleItem ──────────────────────────────────────────────────────── */
function ArticleItem({ article, highlight }) {
  const [showAbstract, setShowAbstract] = useState(false)
  const [showCite, setShowCite] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  // Auto-open abstract when navigated to via hash
  useEffect(() => {
    if (highlight && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowAbstract(true)
    }
  }, [highlight])

  const handleCopyCite = () => {
    navigator.clipboard?.writeText(article.citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article
      id={`article-${article.id}`}
      ref={ref}
      style={{
        padding: '30px 0',
        borderBottom: '1px solid #E6E1D6',
        scrollMarginTop: '130px',
        transition: 'background 0.3s',
        background: highlight ? '#FFFDF5' : 'transparent',
        borderLeft: highlight ? '3px solid #C4A24C' : '3px solid transparent',
        paddingLeft: highlight ? '20px' : '0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9A7B23' }}>
          {article.tag}
        </div>
        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', color: '#6B7288', letterSpacing: '0.04em' }}>
          {article.pages} · <span style={{ color: '#2B7A4B', fontWeight: 600 }}>{article.status}</span>
        </div>
      </div>

      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontWeight: 600,
        fontSize: 'clamp(21px, 2.4vw, 26px)',
        lineHeight: 1.25, color: '#0B1B3A', margin: '0 0 8px',
      }}>
        {article.title}
      </h3>

      <div style={{ fontSize: '15px', color: '#3A4157', fontStyle: 'italic', marginBottom: '4px' }}>
        {article.authors}
      </div>
      {article.affiliation && (
        <div style={{ fontSize: '13.5px', color: '#6B7288', marginBottom: '14px' }}>
          {article.affiliation}
        </div>
      )}

      {/* Abstract always shown */}
      {article.abstract && (
        <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 16px', maxWidth: '780px' }}>
          {article.abstract}
        </p>
      )}

      {/* Keywords */}
      {article.keywords && (
        <div style={{ fontSize: '13px', color: '#6B7288', marginBottom: '14px' }}>
          <strong style={{ color: '#0B1B3A' }}>Keywords:</strong> {article.keywords}
        </div>
      )}

      {/* Expandable Abstract Panel (structured) */}
      {showAbstract && (
        <div style={{ background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '3px solid #C4A24C', padding: '16px 20px', marginBottom: '16px', fontSize: '14.5px', lineHeight: 1.7, color: '#3A4157' }}>
          <strong style={{ display: 'block', color: '#0B1B3A', marginBottom: '6px' }}>Structured Abstract:</strong>
          {article.abstract}
        </div>
      )}

      {/* Citation panel */}
      {showCite && (
        <div style={{ background: '#F8F9FB', border: '1px solid #EAECEF', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7288' }}>
              APA 7th Edition Citation
            </span>
            <button
              type="button"
              onClick={handleCopyCite}
              style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', background: '#0B1B3A', color: '#FFFFFF', border: 'none', padding: '5px 11px', borderRadius: '2px', cursor: 'pointer' }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#1C2233', fontStyle: 'italic' }}>
            {article.citation}
          </div>
        </div>
      )}

      {/* Action footer */}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '12.5px', color: '#6B7288', letterSpacing: '0.03em', flexWrap: 'wrap' }}>
        {article.doi && <span>DOI: {article.doi}</span>}
        {article.doi && <span style={{ color: '#E6E1D6' }}>|</span>}
        <ActionButton onClick={() => setShowAbstract(!showAbstract)} active={showAbstract}>
          {showAbstract ? 'Hide Abstract' : 'Abstract'}
        </ActionButton>
        <ActionButton onClick={() => setShowCite(!showCite)} active={showCite}>
          {showCite ? 'Close Cite' : 'Cite'}
        </ActionButton>
      </div>
    </article>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function CurrentIssue() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadHovered, setDownloadHovered] = useState(false)
  const location = useLocation()

  // Fetch real published articles
  useEffect(() => {
    publicService.getCurrentIssueArticles()
      .then(data => setArticles((data || []).map((m, i) => toArticle(m, i))))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [])

  // Determine which article to highlight from URL hash
  const highlightId = location.hash.startsWith('#article-')
    ? location.hash.replace('#article-', '')
    : null

  const pageRange = articles.length > 0
    ? `${articles.length} article${articles.length !== 1 ? 's' : ''}`
    : ''

  return (
    <>
      {/* Page hero */}
      <div style={{
        background: '#0B1B3A',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
        color: '#FFFFFF',
        minHeight: '48vh',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #C4A24C',
      }}>
        <div style={{ width: '100%', maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(56px, 8vw, 92px) var(--layout-pad) clamp(52px, 8vw, 88px)' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '16px' }}>
            {JOURNAL_INFO.name}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Current Issue
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            {JOURNAL_INFO.volume} · {JOURNAL_INFO.issue} · {JOURNAL_INFO.year} ({JOURNAL_INFO.frequency}) — Open Access &amp; Peer-Reviewed
          </p>
        </div>
      </div>

      {/* Content grid */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: '48px 60px',
        alignItems: 'start',
      }}>
        {/* Cover + Info Aside */}
        <aside style={{ position: 'sticky', top: '116px', alignSelf: 'start' }}>
          <div style={{ border: '1px solid #E6E1D6', padding: '10px', background: '#FFFFFF', boxShadow: '0 2px 10px rgba(11,27,58,0.04)' }}>
            <img
              src="/cover-front.jpeg"
              alt="Current issue cover"
              style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }}
            />
          </div>

          <button
            type="button"
            onMouseEnter={() => setDownloadHovered(true)}
            onMouseLeave={() => setDownloadHovered(false)}
            onClick={() => alert('Downloading complete issue PDF...')}
            style={{
              fontFamily: 'Jost, sans-serif', fontSize: '13px',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid #0B1B3A',
              color: downloadHovered ? '#FFFFFF' : '#0B1B3A',
              background: downloadHovered ? '#0B1B3A' : 'transparent',
              padding: '14px', textAlign: 'center',
              marginTop: '16px', cursor: 'pointer', width: '100%',
              fontWeight: 600, transition: 'background 0.15s, color 0.15s',
            }}
          >
            Download Full Issue (PDF)
          </button>

          {/* Journal Metadata */}
          <div style={{ marginTop: '24px', background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '20px 22px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '12px', borderBottom: '1px solid #E6E1D6', paddingBottom: '8px' }}>
              Journal Information
            </div>
            <div style={{ fontSize: '14px', color: '#3A4157', display: 'grid', gap: '8px' }}>
              <div><strong>Journal:</strong> {JOURNAL_INFO.shortName}</div>
              <div><strong>Volume / Issue:</strong> {JOURNAL_INFO.volume}, {JOURNAL_INFO.issue}</div>
              <div><strong>Frequency:</strong> {JOURNAL_INFO.frequency}</div>
              <div><strong>Publication Year:</strong> {JOURNAL_INFO.year}</div>
              <div><strong>ISSN (Online):</strong> {JOURNAL_INFO.issnOnline}</div>
              <div><strong>ISSN (Print):</strong> {JOURNAL_INFO.issnPrint}</div>
              <div><strong>DOI Prefix:</strong> {JOURNAL_INFO.doiPrefix}</div>
            </div>
          </div>

          {/* Issue Highlights */}
          <div style={{ marginTop: '20px', background: '#0B1B3A', color: '#FFFFFF', padding: '22px 20px', borderRadius: '4px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '12px' }}>
              Issue Highlights
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13.5px', display: 'grid', gap: '8px', color: '#C3CBDC' }}>
              {HIGHLIGHTS.map((h, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#C4A24C' }}>✓</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Table of Contents / Article listing */}
        <div>
          {/* Welcome message */}
          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontSize: 'clamp(15.5px, 1.5vw, 17px)', lineHeight: 1.8, color: '#3A4157', margin: 0 }}>
              Welcome to the <strong>Current Issue</strong> section of Asgard Research Publication. This page provides full access to the latest published articles from our peer-reviewed journals. The current issue features original research articles, comprehensive review papers, and scholarly contributions from leading researchers worldwide.
            </p>
          </div>

          {/* Table of Contents Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0B1B3A', paddingBottom: '12px', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0B1B3A', fontWeight: 600 }}>
              Table of Contents
            </div>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.1em', color: '#6B7288' }}>
              {pageRange}
            </div>
          </div>

          {/* Articles */}
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'Jost, sans-serif', color: '#8C94A6', fontSize: '14px', letterSpacing: '0.08em' }}>
              Loading articles…
            </div>
          ) : articles.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'Jost, sans-serif', color: '#8C94A6', fontSize: '14px', letterSpacing: '0.06em' }}>
              No published articles yet. Check back soon.
            </div>
          ) : (
            articles.map(article => (
              <ArticleItem
                key={article.id}
                article={article}
                highlight={article.id === highlightId}
              />
            ))
          )}

          {/* Citation Info */}
          <div style={{ marginTop: '44px', background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: '22px 24px' }}>
            <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '20px', color: '#0B1B3A', margin: '0 0 8px' }}>
              Citation Information
            </h4>
            <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#3A4157', margin: 0 }}>
              When citing articles published in this issue, authors should include: <em>Author(s), Article Title, Journal Name ({JOURNAL_INFO.shortName}), Volume, Issue, Year, Page Numbers, and DOI (where available).</em>
            </p>
          </div>

          {/* Submit & Archive CTA */}
          <div style={{
            marginTop: '36px', background: '#0B1B3A', color: '#FFFFFF',
            padding: '28px 30px', borderRadius: '4px',
            display: 'flex', flexWrap: 'wrap', gap: '20px 32px',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '6px' }}>
                Call for Submissions
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', margin: '0 0 6px' }}>
                Submit Your Manuscript
              </h3>
              <p style={{ fontSize: '14.5px', color: '#C3CBDC', margin: 0 }}>
                Researchers are invited to submit original manuscripts for upcoming quarterly issues.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                to="/guidelines"
                style={{
                  fontFamily: 'Jost, sans-serif', fontSize: '13px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  background: '#C4A24C', color: '#071228', fontWeight: 600,
                  padding: '13px 23px', borderRadius: '2px', textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#E3CB86'}
                onMouseLeave={e => e.currentTarget.style.background = '#C4A24C'}
              >
                Author Guidelines →
              </Link>
              <Link
                to="/archives"
                style={{
                  fontFamily: 'Jost, sans-serif', fontSize: '13px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  border: '1px solid rgba(255,255,255,0.35)', color: '#FFFFFF',
                  padding: '13px 23px', borderRadius: '2px', textDecoration: 'none',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4A24C'; e.currentTarget.style.color = '#E3CB86' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#FFFFFF' }}
              >
                Browse Archives
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ marginTop: '28px', fontSize: '13.5px', color: '#6B7288', lineHeight: 1.6, borderTop: '1px solid #E6E1D6', paddingTop: '16px' }}>
            <strong>Disclaimer:</strong> The opinions and findings expressed in published articles are those of the respective authors and do not necessarily reflect the official views or policies of the Editorial Board or Asgard Research Publication.
          </div>
        </div>
      </div>
    </>
  )
}

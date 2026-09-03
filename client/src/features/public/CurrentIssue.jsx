import { useState } from 'react'
import { Link } from 'react-router-dom'

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
  pageRange: 'Pages 1–38',
  publishedDate: '15 March 2026',
}

const ARTICLES = [
  {
    id: 1,
    tag: 'Original Research Article',
    title: 'Deep Learning Frameworks for Real-Time Threat Detection in Cloud Computing Infrastructures',
    authors: 'Dr. Eleanor Whitfield, Prof. James Nakamura, Dr. S. Selvam',
    affiliation: 'Department of Computer Science & Cybersecurity Research Group',
    abstract: 'This research paper proposes an adaptive deep learning architecture for real-time anomaly detection and mitigation across multi-tenant cloud environments. By integrating recurrent neural networks with temporal graph embeddings, the proposed model demonstrates significant throughput gains and reduced false-positive rates under high network congestion.',
    pages: 'pp. 1–12',
    doi: '10.xxxx/ijidcr.2026.0101',
    status: 'Published',
    citation: 'Whitfield, E., Nakamura, J., & Selvam, S. (2026). Deep Learning Frameworks for Real-Time Threat Detection in Cloud Computing Infrastructures. International Journal of Intelligent Digital Computing Research (IJIDCR), 1(1), 1–12.',
  },
  {
    id: 2,
    tag: 'Review Article',
    title: 'Advances in Blockchain-Enabled Decentralized Identity Management: A Systematic Review',
    authors: 'Dr. Amara Osei, Dr. V. Isakkirajan, Prof. Dr. Dinesh Senduraja',
    affiliation: 'Centre for Distributed Ledger Technologies & Information Systems',
    abstract: 'A comprehensive review of cryptographic schemes, self-sovereign identity (SSI) primitives, and consensus protocols in decentralized identity architectures. This paper systematically evaluates scalability challenges, zero-knowledge proofs, interoperability standards, and privacy-preserving mechanisms across contemporary enterprise deployments.',
    pages: 'pp. 13–24',
    doi: '10.xxxx/ijidcr.2026.0102',
    status: 'Published',
    citation: 'Osei, A., Isakkirajan, V., & Senduraja, D. (2026). Advances in Blockchain-Enabled Decentralized Identity Management: A Systematic Review. International Journal of Intelligent Digital Computing Research (IJIDCR), 1(1), 13–24.',
  },
  {
    id: 3,
    tag: 'Original Research Article',
    title: 'Optimized Convolutional Neural Networks for Edge Computing and IoT Sensor Networks',
    authors: 'Dr. M. Ilayaraja, Prof. Helena Kowalski, Dr. Arul Kumar Natarajan',
    affiliation: 'Intelligent Systems & Ubiquitous Computing Laboratory',
    abstract: 'This study introduces a lightweight quantized Convolutional Neural Network (CNN) pipeline tailored for resource-constrained microcontrollers in Internet of Things (IoT) sensor arrays. Empirical benchmarks illustrate 94.8% classification accuracy alongside a 62% reduction in memory footprint and latency compared to standard baselines.',
    pages: 'pp. 25–38',
    doi: '10.xxxx/ijidcr.2026.0103',
    status: 'Published',
    citation: 'Ilayaraja, M., Kowalski, H., & Natarajan, A. K. (2026). Optimized Convolutional Neural Networks for Edge Computing and IoT Sensor Networks. International Journal of Intelligent Digital Computing Research (IJIDCR), 1(1), 25–38.',
  },
]

const HIGHLIGHTS = [
  'Rigorous Double-Blind Peer Review',
  'Original Research & Review Contributions',
  'Multidisciplinary Computing Scope',
  'Strict Publication Ethics Compliance',
  'Immediate Open Access Distribution',
]

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
        padding: '2px 4px',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function ArticleItem({ article }) {
  const [showAbstract, setShowAbstract] = useState(false)
  const [showCite, setShowCite] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyCite = () => {
    navigator.clipboard?.writeText(article.citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article style={{ padding: '30px 0', borderBottom: '1px solid #E6E1D6' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9A7B23' }}>
          {article.tag}
        </div>
        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', color: '#6B7288', letterSpacing: '0.04em' }}>
          {article.pages} · <span style={{ color: '#2B7A4B', fontWeight: 600 }}>{article.status}</span>
        </div>
      </div>

      <h3
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 600,
          fontSize: 'clamp(21px, 2.4vw, 26px)',
          lineHeight: 1.25,
          color: '#0B1B3A',
          margin: '0 0 8px',
        }}
      >
        {article.title}
      </h3>

      <div style={{ fontSize: '15px', color: '#3A4157', fontStyle: 'italic', marginBottom: '4px' }}>
        {article.authors}
      </div>
      <div style={{ fontSize: '13.5px', color: '#6B7288', marginBottom: '14px' }}>
        {article.affiliation}
      </div>

      <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 16px', maxWidth: '780px' }}>
        {article.abstract}
      </p>

      {/* Interactive Expandable Panels */}
      {showAbstract && (
        <div style={{ background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '3px solid #C4A24C', padding: '16px 20px', marginBottom: '16px', fontSize: '14.5px', lineHeight: 1.7, color: '#3A4157' }}>
          <strong style={{ display: 'block', color: '#0B1B3A', marginBottom: '6px' }}>Structured Abstract:</strong>
          {article.abstract}
        </div>
      )}

      {showCite && (
        <div style={{ background: '#F8F9FB', border: '1px solid #EAECEF', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7288' }}>
              APA 7th Edition Citation
            </span>
            <button
              type="button"
              onClick={handleCopyCite}
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '11.5px',
                background: '#0B1B3A',
                color: '#FFFFFF',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#1C2233', fontStyle: 'italic' }}>
            {article.citation}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '12.5px', color: '#6B7288', letterSpacing: '0.03em', flexWrap: 'wrap' }}>
        <span>DOI: {article.doi}</span>
        <span style={{ color: '#E6E1D6' }}>|</span>
        <ActionButton onClick={() => setShowAbstract(!showAbstract)} active={showAbstract}>
          {showAbstract ? 'Hide Abstract' : 'Abstract'}
        </ActionButton>
        <ActionButton onClick={() => setShowCite(!showCite)} active={showCite}>
          {showCite ? 'Close Cite' : 'Cite'}
        </ActionButton>
        <a
          href={`#download-pdf-${article.id}`}
          onClick={e => { e.preventDefault(); alert(`Downloading PDF: ${article.title}`) }}
          style={{
            color: '#0B1B3A',
            borderBottom: '1px solid #C4A24C',
            textDecoration: 'none',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: '12.5px',
            padding: '2px 4px',
          }}
        >
          Full Text (PDF) ↗
        </a>
      </div>
    </article>
  )
}

export default function CurrentIssue() {
  const [downloadHovered, setDownloadHovered] = useState(false)

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
            onClick={() => alert('Downloading complete issue PDF (Volume 1, Issue 1)...')}
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '13px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              border: '1px solid #0B1B3A',
              color: downloadHovered ? '#FFFFFF' : '#0B1B3A',
              background: downloadHovered ? '#0B1B3A' : 'transparent',
              padding: '13px',
              textAlign: 'center',
              marginTop: '16px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: 600,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Download Full Issue (PDF)
          </button>

          {/* Journal Metadata Block */}
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
          {/* Welcome Message */}
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
              {JOURNAL_INFO.pageRange}
            </div>
          </div>

          {/* Articles */}
          {ARTICLES.map(article => (
            <ArticleItem key={article.id} article={article} />
          ))}

          {/* Citation Info */}
          <div style={{ marginTop: '44px', background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: '22px 24px' }}>
            <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '20px', color: '#0B1B3A', margin: '0 0 8px' }}>
              Citation Information
            </h4>
            <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#3A4157', margin: 0 }}>
              When citing articles published in this issue, authors should include: <em>Author(s), Article Title, Journal Name (IJIDCR), Volume, Issue, Year, Page Numbers, and DOI (where available).</em>
            </p>
          </div>

          {/* Submit & Archive CTA */}
          <div style={{
            marginTop: '36px',
            background: '#0B1B3A',
            color: '#FFFFFF',
            padding: '28px 30px',
            borderRadius: '4px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px 32px',
            alignItems: 'center',
            justifyContent: 'space-between',
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
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: '#C4A24C',
                  color: '#071228',
                  fontWeight: 600,
                  padding: '12px 22px',
                  borderRadius: '2px',
                  textDecoration: 'none',
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
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255,255,255,0.35)',
                  color: '#FFFFFF',
                  padding: '12px 22px',
                  borderRadius: '2px',
                  textDecoration: 'none',
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

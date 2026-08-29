import { useState } from 'react'

const ARTICLES = [
  {
    tag: 'Research article',
    title: 'Democratic Institutions and Public Trust in the Digital Age',
    authors: 'Dr. Eleanor Whitfield, Prof. James Nakamura',
    abstract: 'This article examines the evolving relationship between democratic institutions and public trust in the context of digital communication technologies, drawing on survey data from eleven democracies.',
    meta: 'DOI: 10.xxxx/jcr.2026.001 · pp. 1–24',
  },
  {
    tag: 'Research article',
    title: 'Urban Migration Patterns in Sub-Saharan Africa',
    authors: 'Dr. Amara Osei',
    abstract: 'An empirical analysis of urbanisation trends across twelve sub-Saharan African nations over the past two decades, with attention to informal settlement growth and labour mobility.',
    meta: 'DOI: 10.xxxx/jcr.2026.002 · pp. 25–48',
  },
  {
    tag: 'Review essay',
    title: 'Philosophical Foundations of Contemporary Education Reform',
    authors: 'Prof. Helena Kowalski, Dr. Marcus Singh',
    abstract: 'This paper traces the philosophical underpinnings of current education reform movements in Western democracies and evaluates their coherence against stated policy aims.',
    meta: 'DOI: 10.xxxx/jcr.2026.003 · pp. 49–72',
  },
  {
    tag: 'Commentary',
    title: 'Measuring Institutional Resilience: A Methodological Note',
    authors: 'Dr. Yuki Tanaka',
    abstract: 'A critical assessment of composite indices used to measure institutional resilience, proposing a transparent weighting alternative for cross-national comparison.',
    meta: 'DOI: 10.xxxx/jcr.2026.004 · pp. 73–88',
  },
]

function ArticleItem({ tag, title, authors, abstract, meta }) {
  const [hovered, setHovered] = useState(false)

  return (
    <article style={{ padding: '30px 0', borderBottom: '1px solid #E6E1D6' }}>
      <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '10px' }}>
        {tag}
      </div>
      <h3
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.7vw, 29px)', lineHeight: 1.25, color: hovered ? '#9A7B23' : '#0B1B3A', margin: '0 0 8px', cursor: 'pointer', transition: 'color 0.15s' }}
      >
        {title}
      </h3>
      <div style={{ fontSize: '16px', color: '#3A4157', fontStyle: 'italic', marginBottom: '12px' }}>{authors}</div>
      <p style={{ fontSize: '16.5px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 16px', maxWidth: '780px' }}>
        {abstract}
      </p>
      <div style={{ display: 'flex', gap: '22px', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '12.5px', color: '#6B7288', letterSpacing: '0.03em', flexWrap: 'wrap' }}>
        <span>{meta}</span>
        {['PDF', 'Abstract', 'Cite'].map(action => (
          <ActionLink key={action}>{action}</ActionLink>
        ))}
      </div>
    </article>
  )
}

function ActionLink({ children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ color: hovered ? '#9A7B23' : '#0B1B3A', borderBottom: '1px solid #C4A24C', paddingBottom: '2px', cursor: 'pointer', transition: 'color 0.15s' }}
    >
      {children}
    </span>
  )
}

function DownloadButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '13px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        border: '1px solid #0B1B3A',
        color: hovered ? '#FFFFFF' : '#0B1B3A',
        background: hovered ? '#0B1B3A' : 'transparent',
        padding: '13px',
        textAlign: 'center',
        marginTop: '16px',
        cursor: 'pointer',
        width: '100%',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      Download full issue
    </button>
  )
}

export default function CurrentIssue() {
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
            Volume 12 · Number 1 · Spring 2026
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Current Issue
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            The latest published research
          </p>
        </div>
      </div>

      {/* Content grid */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '48px 60px',
        alignItems: 'start',
      }}>
        {/* Cover aside */}
        <aside style={{ position: 'sticky', top: '116px', alignSelf: 'start' }}>
          <div style={{ border: '1px solid #E6E1D6', padding: '10px', background: '#FFFFFF' }}>
            <img
              src="/cover-front.jpeg"
              alt="Current issue cover"
              style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }}
            />
          </div>
          <DownloadButton />
          <div style={{ marginTop: '26px', fontSize: '15px', color: '#6B7288', lineHeight: 1.7 }}>
            Published 15 March 2026<br />
            8 articles · 196 pages<br />
            DOI: 10.xxxx/jcr.v12i1
          </div>
        </aside>

        {/* Article listing */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0B1B3A', paddingBottom: '14px', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0B1B3A' }}>
              Research articles
            </div>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.1em', color: '#6B7288' }}>
              Pages 1–196
            </div>
          </div>
          {ARTICLES.map(a => <ArticleItem key={a.title} {...a} />)}
        </div>
      </div>
    </>
  )
}

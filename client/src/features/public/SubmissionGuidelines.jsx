import { useState } from 'react'
import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { id: 'downloads', title: 'Downloads & Templates' },
  { id: 'eligibility', title: 'Eligibility' },
  { id: 'categories', title: 'Categories' },
  { id: 'structure', title: 'Structure' },
  { id: 'formatting', title: 'Formatting' },
  { id: 'abstract', title: 'Abstract' },
  { id: 'figures', title: 'Figures & Tables' },
  { id: 'references', title: 'References' },
  { id: 'ethics', title: 'Ethics' },
  { id: 'checklist', title: 'Checklist' },
]

const STEPS = [
  { n: '01', title: 'Prepare', desc: 'Format manuscript according to guidelines (Word .doc/.docx, A4, Times New Roman, 1.5 spacing).' },
  { n: '02', title: 'Submit', desc: 'Upload manuscript, title page, abstract (150–250 words), keywords (3–6), and author details.' },
  { n: '03', title: 'Review', desc: 'Rigorous double-blind peer review and plagiarism check by independent subject matter experts.' },
  { n: '04', title: 'Publish', desc: 'Copyediting, proofreading, DOI assignment, and immediate open-access global publication.' },
]

const ELIGIBILITY = [
  'Original research that has not been published previously in any journal or conference.',
  'Manuscript is not currently under consideration by any other publishing outlet.',
  'Free from plagiarism, self-plagiarism, and unethical research practices.',
  'Presents significant scientific, technical, or scholarly contributions.',
  'Written in clear, grammatically sound, professional English.',
]

const CATEGORIES = [
  { name: 'Original Research Articles', desc: 'Full-length papers reporting novel theoretical or experimental findings with comprehensive methodologies and discussions.' },
  { name: 'Review Articles', desc: 'Critical surveys of existing literature providing in-depth synthesis and future directions in a given domain.' },
  { name: 'Survey Papers', desc: 'Comprehensive overviews and state-of-the-art taxonomic comparisons across emerging technologies.' },
  { name: 'Case Studies', desc: 'Detailed examinations of specific real-world implementations, challenges, and empirical observations.' },
  { name: 'Short Communications', desc: 'Concise reports of significant preliminary results, innovative models, or urgent breakthroughs.' },
  { name: 'Technical Notes', desc: 'Brief descriptions of novel techniques, apparatus, algorithms, or software development implementations.' },
]

const STRUCTURE_SECTIONS = [
  'Title (concise and informative)',
  'Author Name(s) and Complete Affiliation(s)',
  'Corresponding Author Details (Email, Institutional Address)',
  'Abstract (150–250 words)',
  'Keywords (3–6 representative terms)',
  'Introduction (background, problem statement, objectives)',
  'Literature Review (contextual background)',
  'Materials and Methods / Methodology (reproducible workflow)',
  'Results (clear empirical/experimental findings)',
  'Discussion (interpretation and comparison with existing literature)',
  'Conclusion & Future Scope (key takeaways and outlook)',
  'Acknowledgements & Funding Information (if applicable)',
  'Conflict of Interest Statement (mandatory disclosure)',
  'References (formatted consistently)',
]

const FORMATTING = [
  { k: 'Language', v: 'English (US or UK spelling, used consistently)' },
  { k: 'File format', v: 'Microsoft Word (.doc or .docx)' },
  { k: 'Paper size', v: 'A4 standard' },
  { k: 'Typeface', v: 'Times New Roman' },
  { k: 'Title size', v: '16 pt (Bold)' },
  { k: 'Headings size', v: '14 pt (Bold)' },
  { k: 'Body text size', v: '12 pt (Regular)' },
  { k: 'Line spacing', v: '1.5 lines throughout' },
  { k: 'Margins', v: '1 inch (2.54 cm) on all sides' },
  { k: 'Page numbers', v: 'Bottom center consecutively' },
  { k: 'Figures & tables', v: 'Numbered consecutively with captions (min. 300 DPI)' },
  { k: 'Equations', v: 'Numbered sequentially with defined variables' },
]

const CITATION_STYLES = [
  { name: 'IEEE', desc: 'Preferred for Computer Science, Electrical Engineering & IT papers.' },
  { name: 'APA (7th Edition)', desc: 'Standard for Social Sciences, Management & Interdisciplinary Studies.' },
  { name: 'Vancouver', desc: 'Recommended for Medical, Health & Biomedical Sciences.' },
  { name: 'Elsevier', desc: 'Accepted for Applied Sciences and Engineering disciplines.' },
]

const CHECKLIST = [
  'Manuscript is complete and structured according to guidelines.',
  'Abstract (150–250 words) and 3–6 keywords are included.',
  'All figures, tables, and equations are high-resolution and numbered with captions.',
  'References are correctly cited in-text and formatted consistently.',
  'Plagiarism check performed with all original sources cited.',
  'Conflict of interest statement and funding information disclosed.',
  'Grammar, spelling, and language clarity thoroughly proofread.',
  'All co-authors have reviewed and approved the manuscript for submission.',
]

const DOWNLOADS = [
  { name: 'Manuscript Template (.docx)', ext: 'DOCX', desc: 'Standard Word formatting template with preconfigured styles' },
  { name: 'Author Submission Checklist', ext: 'PDF', desc: 'Verification checklist to review before submitting' },
  { name: 'Copyright Agreement Form', ext: 'PDF', desc: 'Open-access licensing and copyright assignment form' },
  { name: 'Reference Style Guide', ext: 'PDF', desc: 'Detailed citation styling instructions and examples' },
]

function SectionCard({ id, title, subtitle, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <article
      id={id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        borderTop: '3px solid #C4A24C',
        padding: 'clamp(24px, 3vw, 36px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 6px 20px rgba(11, 27, 58, 0.06)' : 'none',
        scrollMarginTop: '140px',
      }}
    >
      <div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 600,
          fontSize: 'clamp(22px, 2.4vw, 30px)',
          color: '#0B1B3A',
          margin: '0 0 6px',
        }}>
          {title}
        </h2>
        <div style={{ width: '44px', height: '2px', background: '#C4A24C', marginBottom: '18px' }} />
        {subtitle && (
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: 'clamp(17px, 1.8vw, 21px)',
            color: '#7E6116',
            margin: '0 0 16px',
          }}>
            {subtitle}
          </h3>
        )}
        {children}
      </div>
    </article>
  )
}

function NavPill({ id, title }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={`#${id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '12px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 600,
        padding: '7px 14px',
        borderRadius: '2px',
        background: hovered ? '#C4A24C' : 'rgba(196, 162, 76, 0.1)',
        color: hovered ? '#071228' : '#0B1B3A',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        border: '1px solid rgba(196, 162, 76, 0.25)',
      }}
    >
      {title}
    </a>
  )
}

function DownloadItem({ name, ext, desc }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '16px 20px',
        background: hovered ? '#F8F9FB' : '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        borderLeft: '4px solid #0B1B3A',
        borderRadius: '0 4px 4px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <strong style={{ display: 'block', color: '#0B1B3A', fontSize: '15px', marginBottom: '3px' }}>
          {name}
        </strong>
        <span style={{ fontSize: '13px', color: '#6B7288' }}>{desc}</span>
      </div>
      <span style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#C4A24C',
        background: '#0B1B3A',
        padding: '5px 10px',
        borderRadius: '3px',
      }}>
        {ext}
      </span>
    </div>
  )
}

export default function SubmissionGuidelines() {
  return (
    <>
      {/* Page Hero */}
      <div style={{
        background: '#0B1B3A',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
        color: '#FFFFFF',
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #C4A24C',
      }}>
        <div style={{ width: '100%', maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(28px, 3.5vw, 44px) var(--layout-pad)' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '14px' }}>
            For Authors &amp; Researchers
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(32px, 5.2vw, 54px)', margin: '0 0 14px', lineHeight: 1.15 }}>
            Author Guidelines
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Comprehensive instructions for preparing and submitting manuscripts to Asgard Research Publication
          </p>
        </div>
      </div>

      {/* Steps Bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E6E1D6' }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '0 var(--layout-pad)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
        }}>
          {STEPS.map(st => (
            <div key={st.n} style={{ padding: '28px 22px', borderLeft: '1px solid #E6E1D6' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(24px, 3vw, 32px)', color: '#C4A24C', lineHeight: 1, marginBottom: '8px', fontWeight: 700 }}>
                {st.n}
              </div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0B1B3A', marginBottom: '6px', fontWeight: 700 }}>
                {st.title}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7288', lineHeight: 1.55 }}>{st.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal Jump Navigation Bar */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E6E1D6',
        position: 'sticky',
        top: '88px',
        zIndex: 40,
        boxShadow: '0 2px 8px rgba(11, 27, 58, 0.03)',
      }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '12px var(--layout-pad)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <span style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#8C94A6',
            marginRight: '6px',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}>
            On this page:
          </span>
          {NAV_LINKS.map(link => (
            <NavPill key={link.id} id={link.id} title={link.title} />
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(32px, 4.5vw, 56px) var(--layout-pad) clamp(64px, 8vw, 96px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
      }}>
        {/* Section 1: Author Downloads & Submission Portal (Moved to Front) */}
        <SectionCard id="downloads" title="Author Downloads &amp; Manuscript Templates" subtitle="Official Files for Manuscript Preparation">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: '32px',
            alignItems: 'center',
          }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              {DOWNLOADS.map(d => (
                <DownloadItem key={d.name} {...d} />
              ))}
            </div>

            <div style={{
              background: '#0B1B3A',
              color: '#FFFFFF',
              padding: '30px 28px',
              borderRadius: '4px',
              borderTop: '3px solid #C4A24C',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', fontWeight: 600 }}>
                Ready to Publish?
              </div>
              <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                Submit Your Manuscript
              </h4>
              <p style={{ fontSize: '14px', color: '#C3CBDC', lineHeight: 1.6, margin: 0 }}>
                Log in to the author portal to upload your manuscript file, title page, and metadata for fast-track peer review.
              </p>
              <Link
                to="/login"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'linear-gradient(180deg, #D4AF37 0%, #C4A24C 60%, #B38E2F 100%)',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  textAlign: 'center',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  marginTop: '8px',
                  boxShadow: '0 2px 6px rgba(196, 162, 76, 0.35)',
                }}
              >
                Submit Manuscript Online →
              </Link>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Overview & Eligibility */}
        <SectionCard id="eligibility" title="1. Manuscript Eligibility" subtitle="Prerequisites for Submission">
          <p style={{ fontSize: 'clamp(15.5px, 1.4vw, 17px)', lineHeight: 1.8, color: '#3A4157', margin: '0 0 20px' }}>
            Thank you for choosing <strong>Asgard Research Publication</strong> for your research publication. Authors are requested to carefully follow these guidelines before submitting their manuscripts. Adhering to these instructions will help ensure a smooth, transparent, and efficient review and publication process.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '14px' }}>
            {ELIGIBILITY.map((r, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'start', padding: '12px 16px', background: '#F8F9FB', border: '1px solid #EAECEF', fontSize: '14.5px', color: '#3A4157', lineHeight: 1.6 }}>
                <span style={{ color: '#C4A24C', fontWeight: 800 }}>✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 3: Manuscript Categories (2-Column Grid) */}
        <SectionCard id="categories" title="2. Manuscript Categories" subtitle="Accepted Scholarly Paper Types">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '18px' }}>
            {CATEGORIES.map((c, idx) => (
              <div key={idx} style={{ padding: '20px 22px', background: '#FFFFFF', border: '1px solid #E6E1D6', borderTop: '3px solid #C4A24C', borderRadius: '2px' }}>
                <strong style={{ display: 'block', color: '#0B1B3A', fontSize: '16px', marginBottom: '6px' }}>{c.name}</strong>
                <span style={{ color: '#555E75', fontSize: '14px', lineHeight: 1.6 }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 4: Manuscript Structure (2-Column Grid) */}
        <SectionCard id="structure" title="3. Manuscript Structure" subtitle="Sequential Order of Manuscript Sections">
          <p style={{ fontSize: '15.5px', color: '#555E75', lineHeight: 1.7, marginBottom: '20px' }}>
            A submitted manuscript should generally contain the following sections in sequential order:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '12px' }}>
            {STRUCTURE_SECTIONS.map((sec, idx) => (
              <div key={idx} style={{ padding: '12px 16px', background: '#F8F9FB', border: '1px solid #EAECEF', fontSize: '14.5px', color: '#3A4157', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#C4A24C', fontWeight: 700, fontSize: '13px', minWidth: '24px' }}>{String(idx + 1).padStart(2, '0')}.</span>
                <span>{sec}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 5: Formatting & Abstract (2 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="formatting" title="4. Formatting Requirements" subtitle="Layout & Typography Specs">
            <div style={{ border: '1px solid #E6E1D6', background: '#FFFFFF' }}>
              {FORMATTING.map(f => (
                <div key={f.k} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 170px) minmax(0, 1fr)', gap: '12px 16px', padding: '11px 16px', borderBottom: '1px solid #EFEBE1', fontSize: '14px' }}>
                  <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7288', paddingTop: '2px' }}>
                    {f.k}
                  </div>
                  <div style={{ color: '#1C2233', fontWeight: 500 }}>{f.v}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="abstract" title="5. Abstract &amp; Keywords" subtitle="Indexing & Discovery">
            <div style={{ background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: '20px 22px', marginBottom: '20px' }}>
              <strong style={{ color: '#0B1B3A', display: 'block', marginBottom: '10px', fontSize: '15.5px' }}>Abstract Specifications (150–250 words):</strong>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
                <li style={{ fontSize: '14px', color: '#3A4157' }}>• Clearly describe the primary objective of the study.</li>
                <li style={{ fontSize: '14px', color: '#3A4157' }}>• Briefly explain the methodology and experimental setup.</li>
                <li style={{ fontSize: '14px', color: '#3A4157' }}>• Summarize key empirical findings and data outcomes.</li>
                <li style={{ fontSize: '14px', color: '#3A4157' }}>• Highlight the significance, novelty, and practical implications.</li>
              </ul>
            </div>
            <div style={{ padding: '16px 20px', background: '#FFF9EB', border: '1px solid #F3E0B5', borderRadius: '2px' }}>
              <strong style={{ color: '#7E6116', display: 'block', marginBottom: '4px', fontSize: '14.5px' }}>Keywords (3–6 terms):</strong>
              <span style={{ fontSize: '14px', color: '#4B5468', lineHeight: 1.6 }}>
                Provide representative keywords that accurately characterize the core research theme for academic discovery and search indexing.
              </span>
            </div>
          </SectionCard>
        </div>

        {/* Section 6: Figures/Tables & References (2 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="figures" title="6. Figures, Tables &amp; Equations" subtitle="Visual & Mathematical Standards">
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ padding: '16px 18px', background: '#FDFCF9', border: '1px solid #EAE6DC', borderLeft: '4px solid #0B1B3A' }}>
                <strong style={{ color: '#0B1B3A', display: 'block', marginBottom: '4px', fontSize: '15px' }}>Figures &amp; Tables:</strong>
                <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#3A4157', margin: 0 }}>
                  Numbered consecutively with self-explanatory descriptive captions. All graphics must be sharp and clear (minimum <strong>300 DPI</strong> resolution). Every figure and table must be explicitly cited in the text.
                </p>
              </div>

              <div style={{ padding: '16px 18px', background: '#FDFCF9', border: '1px solid #EAE6DC', borderLeft: '4px solid #C4A24C' }}>
                <strong style={{ color: '#0B1B3A', display: 'block', marginBottom: '4px', fontSize: '15px' }}>Equations:</strong>
                <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#3A4157', margin: 0 }}>
                  Numbered sequentially using parentheses <code>(1)</code>, <code>(2)</code>. All variables and mathematical symbols must be defined upon first introduction.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="references" title="7. References &amp; Citation Styles" subtitle="Bibliographic Integrity">
            <p style={{ fontSize: '14.5px', color: '#555E75', lineHeight: 1.6, marginBottom: '16px' }}>
              Use one citation style consistently throughout the manuscript. Ensure every in-text citation appears in the reference list and vice versa.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
              {CITATION_STYLES.map(s => (
                <div key={s.name} style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E6E1D6', borderTop: '2px solid #C4A24C' }}>
                  <strong style={{ color: '#0B1B3A', display: 'block', marginBottom: '3px', fontSize: '14.5px' }}>{s.name}</strong>
                  <span style={{ color: '#555E75', fontSize: '13px', lineHeight: 1.5 }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Section 7: Plagiarism & Publication Ethics */}
        <SectionCard id="ethics" title="8. Plagiarism &amp; Publication Ethics" subtitle="Zero Tolerance Policy & Research Integrity">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '20px' }}>
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: '#3A4157', margin: 0 }}>
              Asgard Research Publication maintains a strict zero-tolerance policy against plagiarism. All submitted manuscripts are screened using standard plagiarism detection software prior to peer review. Any form of verbatim copying without citation, paraphrasing without attribution, data falsification, or image manipulation will result in immediate rejection.
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: '#3A4157', margin: 0 }}>
              Authors must ensure all co-authors contributed significantly, necessary institutional ethical clearances were obtained, and all funding bodies and potential conflicts of interest are disclosed.
            </p>
          </div>
        </SectionCard>

        {/* Section 8: Checklist & Editorial Assistance */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="checklist" title="9. Author Submission Checklist" subtitle="Final Verification">
            <div style={{ display: 'grid', gap: '10px' }}>
              {CHECKLIST.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#F8F9FB', border: '1px solid #EAECEF', fontSize: '13.5px', color: '#3A4157' }}>
                  <span style={{ color: '#C4A24C', fontWeight: 800 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="assistance" title="Need Assistance?" subtitle="Editorial Office Support">
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 20px' }}>
              For questions regarding manuscript preparation, scope verification, formatting exceptions, or submission workflow, our editorial team is available to assist you.
            </p>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '12px 16px', background: '#F8F9FB', borderLeft: '3px solid #C4A24C' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7288', display: 'block' }}>Email Support</span>
                <a href="mailto:ceo@ijidcr-asgard.in" style={{ color: '#0B1B3A', fontWeight: 600, textDecoration: 'none', fontSize: '14.5px' }}>
                  ceo@ijidcr-asgard.in
                </a>
              </div>
              <div style={{ padding: '12px 16px', background: '#F8F9FB', borderLeft: '3px solid #C4A24C' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7288', display: 'block' }}>Technical Inquiries</span>
                <a href="mailto:support@ijidcr-asgard.in" style={{ color: '#0B1B3A', fontWeight: 600, textDecoration: 'none', fontSize: '14.5px' }}>
                  support@ijidcr-asgard.in
                </a>
              </div>
            </div>

            <Link
              to="/contact"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#0B1B3A',
                textDecoration: 'underline',
              }}
            >
              Contact Us Page →
            </Link>
          </SectionCard>
        </div>
      </div>
    </>
  )
}

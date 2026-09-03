import { useState } from 'react'
import { Link } from 'react-router-dom'

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
  { k: 'Figures & tables', v: 'Numbered consecutively with descriptive captions (min. 300 DPI)' },
  { k: 'Equations', v: 'Numbered sequentially with defined variables and symbols' },
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
  { name: 'Manuscript Template (.docx)', ext: 'DOCX' },
  { name: 'Author Submission Checklist', ext: 'PDF' },
  { name: 'Copyright Agreement Form', ext: 'PDF' },
  { name: 'Reference Style Guide', ext: 'PDF' },
]

function DownloadRow({ name, ext }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '13px 0',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
        fontSize: '14.5px',
        cursor: 'pointer',
        color: hovered ? '#E3CB86' : '#FFFFFF',
        transition: 'color 0.15s',
      }}
    >
      <span>{name}</span>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{ext}</span>
    </div>
  )
}

export default function SubmissionGuidelines() {
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
            For Authors &amp; Researchers
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Author Guidelines
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Comprehensive instructions for preparing and submitting manuscripts to Asgard Research Publication
          </p>
        </div>
      </div>

      {/* Steps bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E6E1D6' }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '0 var(--layout-pad)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
        }}>
          {STEPS.map(st => (
            <div key={st.n} style={{ padding: '30px 24px', borderLeft: '1px solid #E6E1D6' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(25px, 3.2vw, 34px)', color: '#C4A24C', lineHeight: 1, marginBottom: '10px' }}>
                {st.n}
              </div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0B1B3A', marginBottom: '6px' }}>
                {st.title}
              </div>
              <div style={{ fontSize: '14.5px', color: '#6B7288', lineHeight: 1.55 }}>{st.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content + aside */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '48px 64px',
        alignItems: 'start',
      }}>
        {/* Content */}
        <div style={{ maxWidth: '760px' }}>

          {/* Intro */}
          <section style={{ marginBottom: '44px' }}>
            <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: 0 }}>
              Thank you for choosing <strong>Asgard Research Publication</strong> for your research publication. Authors are requested to carefully follow these guidelines before submitting their manuscripts. Adhering to these instructions will help ensure a smooth, transparent, and efficient review and publication process.
            </p>
          </section>

          {/* 1. Manuscript Eligibility */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              1. Manuscript Eligibility
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gap: '12px' }}>
              {ELIGIBILITY.map((r, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '14px', alignItems: 'start', fontSize: '15.5px', color: '#3A4157', lineHeight: 1.6 }}>
                  <div style={{ width: '6px', height: '6px', background: '#C4A24C', marginTop: '9px', borderRadius: '50%' }} />
                  <div>{r}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Manuscript Categories */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              2. Manuscript Categories
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {CATEGORIES.map((c, idx) => (
                <div key={idx} style={{ padding: '16px 18px', background: '#FFFFFF', border: '1px solid #E6E1D6', borderTop: '2px solid #C4A24C' }}>
                  <strong style={{ display: 'block', color: '#0B1B3A', fontSize: '15px', marginBottom: '4px' }}>{c.name}</strong>
                  <span style={{ color: '#555E75', fontSize: '13.5px', lineHeight: 1.55 }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Manuscript Structure */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              3. Manuscript Structure
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <p style={{ fontSize: '15.5px', color: '#555E75', lineHeight: 1.7, marginBottom: '16px' }}>
              A submitted manuscript should generally contain the following sections in sequential order:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {STRUCTURE_SECTIONS.map((sec, idx) => (
                <div key={idx} style={{ padding: '10px 14px', background: '#F8F9FB', border: '1px solid #EAECEF', fontSize: '14px', color: '#3A4157', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#C4A24C', fontWeight: 600, fontSize: '12px' }}>{String(idx + 1).padStart(2, '0')}.</span>
                  <span>{sec}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Formatting Specifications */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              4. Formatting Requirements
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ border: '1px solid #E6E1D6', background: '#FFFFFF' }}>
              {FORMATTING.map(f => (
                <div key={f.k} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 200px) minmax(0, 1fr)', gap: '12px 20px', padding: '14px 20px', borderBottom: '1px solid #EFEBE1', fontSize: '15px' }}>
                  <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7288', paddingTop: '2px' }}>
                    {f.k}
                  </div>
                  <div style={{ color: '#1C2233', fontWeight: 500 }}>{f.v}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Abstract & Keywords */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              5. Abstract &amp; Keywords
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: '20px 24px', marginBottom: '16px' }}>
              <strong style={{ color: '#0B1B3A', display: 'block', marginBottom: '8px', fontSize: '15.5px' }}>Abstract Specifications (150–250 words):</strong>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '6px', fontSize: '14.5px', color: '#3A4157' }}>• Clearly describe the primary objective of the study.</li>
                <li style={{ marginBottom: '6px', fontSize: '14.5px', color: '#3A4157' }}>• Briefly explain the methodology and experimental setup.</li>
                <li style={{ marginBottom: '6px', fontSize: '14.5px', color: '#3A4157' }}>• Summarize key empirical findings and data outcomes.</li>
                <li style={{ fontSize: '14.5px', color: '#3A4157' }}>• Highlight the significance, novelty, and practical implications.</li>
              </ul>
            </div>
            <p style={{ fontSize: '15px', color: '#555E75', lineHeight: 1.6 }}>
              <strong>Keywords:</strong> Provide <strong>3–6 keywords</strong> that accurately characterize the core research theme for academic indexing and discovery.
            </p>
          </section>

          {/* 6. Figures, Tables & Equations */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              6. Figures, Tables &amp; Equations
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: '#3A4157', marginBottom: '12px' }}>
              • <strong>Figures &amp; Tables:</strong> Numbered consecutively with self-explanatory descriptive captions. All graphics must be sharp and clear (minimum <strong>300 DPI</strong> resolution). Every figure and table must be explicitly cited in the text.
            </p>
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: '#3A4157', margin: 0 }}>
              • <strong>Equations:</strong> Numbered sequentially using parentheses <code>(1)</code>, <code>(2)</code>. All variables and mathematical symbols must be defined upon first introduction.
            </p>
          </section>

          {/* 7. References & Citation Styles */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              7. References &amp; Citation Styles
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <p style={{ fontSize: '15.5px', color: '#3A4157', lineHeight: 1.7, marginBottom: '16px' }}>
              Use one citation style consistently throughout the manuscript. Ensure every in-text citation appears in the reference list and vice versa.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {CITATION_STYLES.map(s => (
                <div key={s.name} style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E6E1D6' }}>
                  <strong style={{ color: '#0B1B3A', display: 'block', marginBottom: '4px', fontSize: '15px' }}>{s.name}</strong>
                  <span style={{ color: '#555E75', fontSize: '13.5px', lineHeight: 1.5 }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Plagiarism Policy & Ethics */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              8. Plagiarism &amp; Publication Ethics
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', marginBottom: '14px' }}>
              Asgard Research Publication maintains a strict zero-tolerance policy against plagiarism. All submitted manuscripts are screened using standard plagiarism detection software prior to peer review. Any form of verbatim copying without citation, paraphrasing without attribution, data falsification, or image manipulation will result in immediate rejection.
            </p>
            <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: 0 }}>
              Authors must ensure all co-authors contributed significantly, necessary institutional ethical clearances were obtained, and all funding bodies and potential conflicts of interest are disclosed.
            </p>
          </section>

          {/* 9. Submission Checklist */}
          <section style={{ marginBottom: '44px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              9. Author Submission Checklist
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gap: '10px' }}>
              {CHECKLIST.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#FFFFFF', border: '1px solid #E6E1D6', fontSize: '14.5px', color: '#3A4157' }}>
                  <span style={{ color: '#C4A24C', fontWeight: 700, fontSize: '16px' }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Note */}
          <div style={{ borderLeft: '3px solid #C4A24C', background: '#FFFFFF', padding: '22px 26px', fontSize: '15.5px', lineHeight: 1.7, color: '#3A4157', border: '1px solid #E6E1D6', borderLeftWidth: '3px', borderLeftColor: '#C4A24C' }}>
            <strong style={{ color: '#0B1B3A' }}>Need Assistance?</strong> For questions regarding manuscript preparation, scope verification, or submission workflow, contact the Editorial Office through the{' '}
            <Link to="/contact" style={{ color: '#0B1B3A', borderBottom: '1px solid #C4A24C', textDecoration: 'none', fontWeight: 500 }}>contact page</Link>.
          </div>
        </div>

        {/* Downloads aside */}
        <aside style={{ position: 'sticky', top: '116px', background: '#0B1B3A', color: '#FFFFFF', padding: '32px 28px', borderRadius: '4px' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '18px' }}>
            Author Downloads
          </div>
          {DOWNLOADS.map(d => <DownloadRow key={d.name} {...d} />)}
          <Link
            to="/login"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '13.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: '#C4A24C',
              color: '#071228',
              fontWeight: 600,
              padding: '14px',
              textAlign: 'center',
              marginTop: '26px',
              cursor: 'pointer',
              display: 'block',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E3CB86'}
            onMouseLeave={e => e.currentTarget.style.background = '#C4A24C'}
          >
            Submit Manuscript →
          </Link>
        </aside>
      </div>
    </>
  )
}

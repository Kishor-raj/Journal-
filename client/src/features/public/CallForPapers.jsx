import { useState } from 'react'
import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { id: 'overview', title: 'Overview' },
  { id: 'areas-of-interest', title: 'Areas of Interest' },
  { id: 'manuscript-types', title: 'Manuscript Types' },
  { id: 'submission-guidelines', title: 'Guidelines' },
  { id: 'peer-review', title: 'Peer Review' },
  { id: 'how-to-submit', title: 'How to Submit' },
  { id: 'editorial-contact', title: 'Contact Office' },
]

const DISCIPLINES = [
  {
    category: 'Computer Science & Information Technology',
    icon: '💻',
    topics: [
      'Artificial Intelligence',
      'Machine Learning',
      'Data Science',
      'Cyber Security',
      'Cloud Computing',
      'Internet of Things (IoT)',
      'Software Engineering',
      'Computer Networks',
      'Blockchain',
      'Big Data Analytics',
    ],
  },
  {
    category: 'Engineering',
    icon: '⚙️',
    topics: [
      'Civil Engineering',
      'Mechanical Engineering',
      'Electrical Engineering',
      'Electronics & Communication Engineering',
      'Robotics and Automation',
      'Renewable Energy',
      'Industrial Engineering',
    ],
  },
]

const MANUSCRIPT_TYPES = [
  {
    title: 'Original Research Articles',
    desc: 'Full-length scientific papers reporting novel theoretical, numerical, or experimental findings with comprehensive methodologies and discussions.',
  },
  {
    title: 'Review Articles',
    desc: 'Critical and structured surveys of existing literature providing in-depth synthesis, state-of-the-art perspectives, and future research directions.',
  },
  {
    title: 'Survey Papers',
    desc: 'Comprehensive taxonomy, systematic reviews, and holistic comparative overviews across emerging technologies and paradigms.',
  },
  {
    title: 'Case Studies',
    desc: 'Detailed empirical analyses, industrial implementations, real-world case validations, and technological problem resolutions.',
  },
  {
    title: 'Short Communications',
    desc: 'Concise reports of significant preliminary results, innovative models, urgent breakthrough discoveries, or brief scientific remarks.',
  },
  {
    title: 'Technical Notes',
    desc: 'Brief descriptions of novel technical procedures, analytical apparatus, software development implementations, or experimental algorithms.',
  },
]

const GUIDELINE_ITEMS = [
  'The manuscript is original and has not been published or submitted elsewhere.',
  'All authors have reviewed and approved the final version of the manuscript.',
  'Proper citations, bibliographic formatting, and verified references are included.',
  "The manuscript strictly follows the journal's official formatting guidelines.",
  'The research complies with international research integrity and publication ethics standards.',
]

const PEER_REVIEW_STEPS = [
  { n: '01', title: 'Editorial Screening', desc: 'Initial evaluation of scope alignment, formatting compliance, and completeness.' },
  { n: '02', title: 'Plagiarism Check', desc: 'Rigorous automated similarity indexing and originality verification.' },
  { n: '03', title: 'Double-Blind Peer Review', desc: 'Independent expert evaluation by at least two external subject matter reviewers.' },
  { n: '04', title: 'Author Revision', desc: 'Constructive revision cycles addressing reviewer recommendations and critiques.' },
  { n: '05', title: 'Final Editorial Decision', desc: 'Formal acceptance or decision communicated by the Editor-in-Chief.' },
  { n: '06', title: 'Copyediting & Proofs', desc: 'Professional typesetting, metadata indexing, proofreading, and DOI assignment.' },
  { n: '07', title: 'Online Publication', desc: 'Immediate global open-access publication and permanent archive hosting.' },
]

const SUBMISSION_ITEMS = [
  'Manuscript (Microsoft Word .doc / .docx format)',
  'Title Page with Full Author Affiliations & Corresponding Details',
  'Abstract (150–250 words) and Keywords (3–6 keywords)',
  'High-Resolution Figures and Tables (if applicable)',
  'Conflict of Interest & Declaration of Originality',
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

export default function CallForPapers() {
  return (
    <>
      {/* Hero Header */}
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
            Asgard Research Publication
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(32px, 5.2vw, 54px)', margin: '0 0 14px', lineHeight: 1.15 }}>
            Call for Papers
          </h1>
          <p style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', color: '#E3CB86', margin: '0 0 16px', fontWeight: 500 }}>
            Submit Your Research for Publication
          </p>
          <p style={{ fontSize: 'clamp(14.5px, 1.35vw, 16.5px)', color: '#C3CBDC', margin: 0, maxWidth: '880px', lineHeight: 1.7 }}>
            Asgard Research Publication invites researchers, academicians, scientists, industry professionals, and postgraduate scholars to submit original, high-quality research manuscripts for publication in our peer-reviewed academic journals.
          </p>
        </div>
      </div>

      {/* Horizontal Sticky Navigation */}
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
        {/* Section 1: Overview & Welcome */}
        <SectionCard id="overview" title="Invitation to Authors" subtitle="Advancing Knowledge Through Scholarly Publishing">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '24px' }}>
            <p style={{ fontSize: 'clamp(15.5px, 1.4vw, 17px)', lineHeight: 1.8, color: '#3A4157', margin: 0 }}>
              Asgard Research Publication invites researchers, academicians, scientists, industry professionals, and postgraduate scholars to submit original, high-quality research manuscripts for publication in our peer-reviewed academic journals.
            </p>
            <p style={{ fontSize: 'clamp(15.5px, 1.4vw, 17px)', lineHeight: 1.8, color: '#3A4157', margin: 0 }}>
              We welcome contributions that present novel research findings, innovative methodologies, theoretical advancements, practical applications, and comprehensive review articles across a broad range of disciplines.
            </p>
          </div>

          <div style={{
            marginTop: '24px',
            padding: '18px 24px',
            background: 'linear-gradient(135deg, rgba(196,162,76,0.12) 0%, rgba(11,27,58,0.04) 100%)',
            borderLeft: '4px solid #C4A24C',
            borderRadius: '0 6px 6px 0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div>
              <strong style={{ display: 'block', color: '#0B1B3A', fontSize: '15.5px', marginBottom: '4px' }}>
                Open Submissions for Upcoming Issue
              </strong>
              <span style={{ color: '#555E75', fontSize: '14px' }}>
                Peer-reviewed · Fast-track Editorial Decision · DOI Assignment · Immediate Open Access
              </span>
            </div>
            <Link
              to="/login"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '13.5px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                background: 'linear-gradient(180deg, #D4AF37 0%, #C4A24C 60%, #B38E2F 100%)',
                padding: '9px 20px',
                borderRadius: '9999px',
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(196, 162, 76, 0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              Submit Manuscript
            </Link>
          </div>
        </SectionCard>

        {/* Section 2: Areas of Interest */}
        <SectionCard id="areas-of-interest" title="Areas of Interest" subtitle="Core Tracks & Specialized Research Domains">
          <p style={{ fontSize: '15.5px', color: '#555E75', margin: '0 0 24px', lineHeight: 1.6 }}>
            We invite high-impact research manuscripts in, but are not limited to, the following primary disciplines:
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: '28px',
            alignItems: 'stretch',
          }}>
            {DISCIPLINES.map((disc, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FDFCF9',
                  border: '1px solid #EAE6DC',
                  borderTop: '3px solid #0B1B3A',
                  padding: '24px 26px',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(11, 27, 58, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '26px' }}>{disc.icon}</span>
                  <h4 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 700,
                    fontSize: '21px',
                    color: '#0B1B3A',
                    margin: 0,
                  }}>
                    {disc.category}
                  </h4>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
                  gap: '10px',
                  marginTop: '4px',
                }}>
                  {disc.topics.map((topic, tIdx) => (
                    <div
                      key={tIdx}
                      style={{
                        fontSize: '13.5px',
                        fontFamily: 'Jost, sans-serif',
                        background: '#FFFFFF',
                        border: '1px solid #E2DCCE',
                        borderLeft: '3px solid #C4A24C',
                        color: '#2B3347',
                        padding: '8px 12px',
                        borderRadius: '0 3px 3px 0',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ color: '#C4A24C', fontSize: '12px' }}>•</span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 3: Types of Manuscripts Accepted */}
        <SectionCard id="manuscript-types" title="Types of Manuscripts Accepted" subtitle="Scholarly Formats Welcomed for Review">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '20px',
          }}>
            {MANUSCRIPT_TYPES.map((type, idx) => (
              <div
                key={idx}
                style={{
                  padding: '18px 20px',
                  background: '#F8F9FB',
                  border: '1px solid #EAECEF',
                  borderLeft: '4px solid #C4A24C',
                  borderRadius: '0 4px 4px 0',
                }}
              >
                <strong style={{ display: 'block', color: '#0B1B3A', fontSize: '16px', marginBottom: '6px' }}>
                  {type.title}
                </strong>
                <span style={{ color: '#555E75', fontSize: '14px', lineHeight: 1.6 }}>
                  {type.desc}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 4: Submission Guidelines & Important Notice */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="submission-guidelines" title="Submission Guidelines" subtitle="Author Prerequisites">
            <p style={{ fontSize: '15px', color: '#555E75', margin: '0 0 16px' }}>
              Authors should ensure that:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '14px' }}>
              {GUIDELINE_ITEMS.map((item, idx) => (
                <li key={idx} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '10px', alignItems: 'start', fontSize: '15px', lineHeight: 1.65, color: '#3A4157' }}>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#C4A24C',
                    color: '#0B1B3A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    marginTop: '2px',
                  }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="important-notice" title="Important Notice" subtitle="Integrity & Quality Standards">
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                padding: '16px 18px',
                background: '#FFF9EB',
                border: '1px solid #F3E0B5',
                borderLeft: '4px solid #C4A24C',
                borderRadius: '0 4px 4px 0',
              }}>
                <strong style={{ color: '#7E6116', display: 'block', fontSize: '15px', marginBottom: '4px' }}>
                  Original Work Only
                </strong>
                <span style={{ color: '#4B5468', fontSize: '14px', lineHeight: 1.6 }}>
                  Only original and unpublished manuscripts will be considered for review and publication.
                </span>
              </div>

              <div style={{
                padding: '16px 18px',
                background: '#FDF3F2',
                border: '1px solid #F8D3D0',
                borderLeft: '4px solid #C0392B',
                borderRadius: '0 4px 4px 0',
              }}>
                <strong style={{ color: '#962D22', display: 'block', fontSize: '15px', marginBottom: '4px' }}>
                  Zero Tolerance for Plagiarism
                </strong>
                <span style={{ color: '#4B5468', fontSize: '14px', lineHeight: 1.6 }}>
                  Manuscripts with significant plagiarism, unauthorized image duplication, or ethical concerns will be rejected immediately.
                </span>
              </div>

              <div style={{
                padding: '16px 18px',
                background: '#F0F4FA',
                border: '1px solid #D6E0F0',
                borderLeft: '4px solid #0B1B3A',
                borderRadius: '0 4px 4px 0',
              }}>
                <strong style={{ color: '#0B1B3A', display: 'block', fontSize: '15px', marginBottom: '4px' }}>
                  Editorial Independence
                </strong>
                <span style={{ color: '#4B5468', fontSize: '14px', lineHeight: 1.6 }}>
                  Editorial decisions are strictly based on academic quality, originality, scientific relevance, and reviewer recommendations.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Section 5: Peer Review Process */}
        <SectionCard id="peer-review" title="Peer Review Process" subtitle="Transparent & Rigorous Double-Blind Review Workflow">
          <p style={{ fontSize: '15.5px', color: '#555E75', margin: '0 0 24px', lineHeight: 1.6 }}>
            All submitted manuscripts undergo a structured peer review workflow to ensure academic excellence and research integrity:
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '18px',
          }}>
            {PEER_REVIEW_STEPS.map(step => (
              <div
                key={step.n}
                style={{
                  background: '#F8F9FB',
                  border: '1px solid #EAECEF',
                  padding: '20px 22px',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '12px',
                  letterSpacing: '0.15em',
                  fontWeight: 700,
                  color: '#C4A24C',
                }}>
                  STEP {step.n}
                </div>
                <h4 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 700,
                  fontSize: '18px',
                  color: '#0B1B3A',
                  margin: 0,
                }}>
                  {step.title}
                </h4>
                <p style={{ fontSize: '13.5px', color: '#555E75', margin: 0, lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 6: How to Submit & What to Include */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="how-to-submit" title="How to Submit" subtitle="Submission Procedure">
            <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 20px' }}>
              Authors may submit their manuscripts through the online submission portal or via the official submission email, as announced by the journal.
            </p>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#C4A24C', fontWeight: 700 }}>•</span>
                <span style={{ fontSize: '15px', color: '#1C2233' }}>
                  <strong>Online Portal:</strong> Submit directly through author dashboard.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#C4A24C', fontWeight: 700 }}>•</span>
                <span style={{ fontSize: '15px', color: '#1C2233' }}>
                  <strong>Official Email:</strong> ceo@ijidcr-asgard.in
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                to="/login"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  background: 'linear-gradient(180deg, #D4AF37 0%, #C4A24C 60%, #B38E2F 100%)',
                  padding: '11px 22px',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(196, 162, 76, 0.35)',
                }}
              >
                Submit Paper Online
              </Link>
              <Link
                to="/guidelines"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#0B1B3A',
                  background: '#FFFFFF',
                  border: '1px solid #C4A24C',
                  padding: '11px 20px',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                }}
              >
                Author Guidelines
              </Link>
            </div>
          </SectionCard>

          <SectionCard id="what-to-include" title="Submission Checklist" subtitle="Please Include in Your Submission Package">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
              {SUBMISSION_ITEMS.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: '#FDFCF9',
                    border: '1px solid #EAE6DC',
                    borderRadius: '2px',
                    fontSize: '14.5px',
                    color: '#2B3347',
                  }}
                >
                  <span style={{ color: '#C4A24C', fontWeight: 800 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* Section 7: Editorial Contact & Community Mission */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="editorial-contact" title="Contact Editorial Office" subtitle="Submission Assistance & Support">
            <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 20px' }}>
              For submission-related queries, manuscript status tracking, or technical assistance, please contact the Editorial Office using the contact channels below.
            </p>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px 16px', background: '#F8F9FB', borderLeft: '3px solid #C4A24C' }}>
                <span style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7288', display: 'block' }}>Email Editorial Desk</span>
                <a href="mailto:ceo@ijidcr-asgard.in" style={{ color: '#0B1B3A', fontWeight: 600, textDecoration: 'none', fontSize: '15px' }}>
                  ceo@ijidcr-asgard.in
                </a>
              </div>
              <div style={{ padding: '12px 16px', background: '#F8F9FB', borderLeft: '3px solid #C4A24C' }}>
                <span style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7288', display: 'block' }}>Support Desk</span>
                <a href="mailto:support@ijidcr-asgard.in" style={{ color: '#0B1B3A', fontWeight: 600, textDecoration: 'none', fontSize: '15px' }}>
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
              Visit Contact Us Page →
            </Link>
          </SectionCard>

          <SectionCard id="community" title="Join Our Global Research Community" subtitle="Excellence in Scholarly Publishing">
            <p style={{ fontSize: 'clamp(15.5px, 1.4vw, 17px)', lineHeight: 1.8, color: '#3A4157', margin: '0 0 20px' }}>
              Publish your research with Asgard Research Publication and contribute to the advancement of knowledge through high-quality, ethical, and impactful scholarly publishing.
            </p>
            <div style={{
              padding: '18px 22px',
              background: 'rgba(196,162,76,0.08)',
              borderLeft: '4px solid #C4A24C',
              borderRadius: '0 4px 4px 0',
              fontStyle: 'italic',
              fontWeight: 600,
              color: '#0B1B3A',
              fontSize: 'clamp(15px, 1.35vw, 16.5px)',
              lineHeight: 1.6,
            }}>
              Asgard Research Publication – Publishing Knowledge with Integrity and Excellence.
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  )
}

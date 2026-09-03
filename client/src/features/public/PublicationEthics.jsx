import { useState } from 'react'
import { Link } from 'react-router-dom'

const ETHICAL_PRINCIPLES = [
  'Academic honesty and integrity',
  'Fair and unbiased editorial decisions',
  'Transparent peer review',
  'Confidentiality throughout the review process',
  'Prevention of plagiarism and research misconduct',
  'Responsible publication practices',
]

const AUTHOR_GROUPS = [
  {
    title: 'Originality',
    items: [
      'Submit only original work.',
      'Properly cite all sources used.',
      'Avoid plagiarism, self-plagiarism, and duplicate publication.',
    ],
  },
  {
    title: 'Multiple or Simultaneous Submission',
    paragraphs: [
      'Authors must not submit the same manuscript to more than one journal at the same time.',
    ],
  },
  {
    title: 'Authorship',
    paragraphs: [
      'Authors listed on the manuscript should have made substantial intellectual contributions to the research.',
      'The corresponding author is responsible for ensuring that all co-authors have reviewed and approved the final manuscript before submission.',
    ],
  },
  {
    title: 'Data Integrity',
    paragraphs: [
      'Authors should present accurate research findings and retain the original research data where appropriate.',
      'Fabrication, falsification, or manipulation of data is strictly prohibited.',
    ],
  },
  {
    title: 'Conflict of Interest',
    paragraphs: [
      'Authors must disclose any financial, institutional, or personal relationships that could influence the research or its interpretation.',
    ],
  },
  {
    title: 'Funding',
    paragraphs: [
      'All sources of financial support must be acknowledged within the manuscript.',
    ],
  },
]

const EDITOR_RESPONSIBILITIES = [
  'Making independent and impartial publication decisions.',
  'Evaluating manuscripts solely on academic merit.',
  'Preserving author and reviewer confidentiality.',
  'Avoiding conflicts of interest.',
  'Taking appropriate action when ethical concerns arise.',
]

const REVIEWER_RESPONSIBILITIES = [
  'Maintain strict confidentiality.',
  'Provide objective, constructive, and evidence-based feedback.',
  'Complete reviews within the agreed timeframe.',
  'Identify relevant published work not cited by the authors.',
  'Inform the editor of any potential conflicts of interest.',
  'Decline the review if they lack the necessary expertise or have a conflict of interest.',
]

const PLAGIARISM_ITEMS = [
  'Direct plagiarism',
  'Self-plagiarism',
  'Duplicate publication',
  'Data fabrication',
  'Data falsification',
  'Image manipulation',
  'Improper citation',
]

const MISCONDUCT_ITEMS = [
  'Fabrication of data',
  'Falsification of results',
  'Plagiarism',
  'Citation manipulation',
  'Fake authorship',
  'Undisclosed conflicts of interest',
  'Manipulation of the peer review process',
]

const CORRECTION_ITEMS = [
  'Publish a correction (Erratum or Corrigendum)',
  'Issue an Expression of Concern',
  'Retract the article when necessary',
]

const POLICY_SECTIONS = [
  {
    title: 'Confidentiality',
    paragraphs: [
      'Editors and reviewers must treat all submitted manuscripts as confidential documents. Information from unpublished manuscripts must not be used for personal research or shared without authorization.',
    ],
  },
  {
    title: 'Copyright and Licensing',
    paragraphs: [
      'Authors are responsible for ensuring that their work does not infringe any copyright or intellectual property rights.',
      'Licensing and copyright arrangements will be communicated clearly before publication.',
    ],
  },
  {
    title: 'Ethical Compliance',
    paragraphs: [
      'Where applicable, manuscripts involving human participants, animals, or sensitive data should include appropriate ethical approval and informed consent statements.',
      'Authors are responsible for complying with all applicable institutional and national ethical requirements.',
    ],
  },
]

function SectionHeading({ children }) {
  return (
    <>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 30px)', color: '#0B1B3A', margin: '0 0 6px' }}>
        {children}
      </h2>
      <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '24px' }} />
    </>
  )
}

function BulletList({ items, marker = 'dot' }) {
  return (
    <div style={{ display: 'grid', gap: '11px' }}>
      {items.map((item, idx) => (
        <div key={item} style={{ display: 'grid', gridTemplateColumns: marker === 'number' ? '32px 1fr' : '18px 1fr', gap: '12px', alignItems: 'start', fontSize: '15.5px', color: '#3A4157', lineHeight: 1.65 }}>
          <span style={{
            width: marker === 'number' ? '28px' : '6px',
            height: marker === 'number' ? '28px' : '6px',
            marginTop: marker === 'number' ? '0' : '9px',
            borderRadius: marker === 'number' ? '50%' : '50%',
            background: marker === 'number' ? 'rgba(196,162,76,0.12)' : '#C4A24C',
            color: '#9A7B23',
            fontFamily: 'Jost, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            lineHeight: marker === 'number' ? '28px' : 1,
            textAlign: 'center',
          }}>
            {marker === 'number' ? String(idx + 1).padStart(2, '0') : ''}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

function DutyCard({ title, paragraphs, items }) {
  const [hovered, setHovered] = useState(false)

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        borderTop: '3px solid #C4A24C',
        padding: '22px 22px 24px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 4px 14px rgba(11,27,58,0.06)' : 'none',
      }}
    >
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(20px, 2.2vw, 23px)', color: '#0B1B3A', margin: '0 0 10px' }}>
        {title}
      </h3>
      {paragraphs?.map(paragraph => (
        <p key={paragraph} style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', margin: '0 0 10px' }}>
          {paragraph}
        </p>
      ))}
      {items && <BulletList items={items} />}
    </article>
  )
}

function PolicyCard({ title, paragraphs }) {
  return (
    <article style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '26px 24px' }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 8px' }}>
        {title}
      </h3>
      <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
      {paragraphs.map(paragraph => (
        <p key={paragraph} style={{ fontSize: '15px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 12px' }}>
          {paragraph}
        </p>
      ))}
    </article>
  )
}

export default function PublicationEthics() {
  return (
    <>
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
            Publication Ethics and Malpractice Statement
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Publication Ethics
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Ethical standards for authors, editors, reviewers, and responsible scholarly publishing
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', maxWidth: '860px', margin: '0 0 44px' }}>
          <strong>Asgard Research Publication</strong> is committed to maintaining the highest standards of academic integrity, transparency, and ethical publishing. Authors, editors, reviewers, and publishers are expected to follow internationally recognized principles of research and publication ethics throughout the publication process.
        </p>

        <section style={{ marginBottom: '52px', background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: 'clamp(24px, 4vw, 36px)', borderRadius: '0 4px 4px 0' }}>
          <SectionHeading>Our Ethical Principles</SectionHeading>
          <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: '#555E75', margin: '0 0 18px' }}>
            We are committed to:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '12px 26px' }}>
            {ETHICAL_PRINCIPLES.map(principle => (
              <div key={principle} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '12px', alignItems: 'start', fontSize: '15.5px', lineHeight: 1.65, color: '#3A4157' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4A24C', marginTop: '9px' }} />
                <span>{principle}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '56px' }}>
          <SectionHeading>Responsibilities of Authors</SectionHeading>
          <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#555E75', margin: '0 0 24px' }}>
            Authors submitting manuscripts to <strong>Asgard Research Publication</strong> must:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
            {AUTHOR_GROUPS.map(group => (
              <DutyCard key={group.title} {...group} />
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '40px', marginBottom: '56px' }}>
          <section>
            <SectionHeading>Responsibilities of Editors</SectionHeading>
            <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#555E75', margin: '0 0 18px' }}>
              Editors are responsible for:
            </p>
            <BulletList items={EDITOR_RESPONSIBILITIES} marker="number" />
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: '#3A4157', margin: '20px 0 0', padding: '18px 20px', background: '#F8F9FB', borderLeft: '3px solid #C4A24C' }}>
              Editors will not discriminate based on nationality, gender, institutional affiliation, religion, or political beliefs.
            </p>
          </section>

          <section>
            <SectionHeading>Responsibilities of Reviewers</SectionHeading>
            <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#555E75', margin: '0 0 18px' }}>
              Reviewers are expected to:
            </p>
            <BulletList items={REVIEWER_RESPONSIBILITIES} marker="number" />
          </section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '32px', marginBottom: '56px' }}>
          <PolicyCard
            title="Plagiarism Policy"
            paragraphs={[
              'All submitted manuscripts are screened for originality before peer review.',
              'The following are considered unacceptable:',
            ]}
          />
          <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '26px 24px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 8px' }}>
              Unacceptable Practices
            </h3>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
            <BulletList items={PLAGIARISM_ITEMS} />
            <p style={{ fontSize: '14.5px', lineHeight: 1.65, color: '#6B7288', margin: '18px 0 0' }}>
              Manuscripts found to violate these standards may be rejected or, if already published, corrected or retracted.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '32px', marginBottom: '56px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '30px 28px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 8px' }}>
              Research Misconduct
            </h3>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', marginBottom: '16px' }}>
              The following practices constitute research misconduct:
            </p>
            <BulletList items={MISCONDUCT_ITEMS} />
            <p style={{ fontSize: '14.5px', color: '#6B7288', lineHeight: 1.6, margin: '18px 0 0' }}>
              Appropriate editorial action will be taken in accordance with the journal&apos;s policies.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '30px 28px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 8px' }}>
              Corrections and Retractions
            </h3>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', marginBottom: '16px' }}>
              If significant errors or ethical issues are identified after publication, the journal may:
            </p>
            <BulletList items={CORRECTION_ITEMS} />
            <p style={{ fontSize: '14.5px', color: '#6B7288', lineHeight: 1.6, margin: '18px 0 0' }}>
              All actions will be taken transparently and documented appropriately.
            </p>
          </div>
        </div>

        <section style={{ marginBottom: '56px' }}>
          <SectionHeading>Additional Policies</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
            {POLICY_SECTIONS.map(section => (
              <PolicyCard key={section.title} {...section} />
            ))}
          </div>
        </section>

        <div style={{
          background: '#0B1B3A',
          color: '#FFFFFF',
          padding: 'clamp(32px, 5vw, 44px)',
          borderRadius: '4px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px 40px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '36px',
        }}>
          <div style={{ maxWidth: '650px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '8px' }}>
              Complaints and Appeals
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 28px)', margin: '0 0 10px' }}>
              Editorial Office Review
            </h3>
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: '#C3CBDC', margin: 0 }}>
              Authors who wish to appeal an editorial decision or report ethical concerns may contact the Editorial Office. All complaints will be handled fairly, confidentially, and in accordance with the journal&apos;s procedures.
            </p>
          </div>
          <Link
            to="/contact"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '13.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: '#C4A24C',
              color: '#071228',
              fontWeight: 600,
              padding: '15px 29px',
              borderRadius: '2px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E3CB86'}
            onMouseLeave={e => e.currentTarget.style.background = '#C4A24C'}
          >
            Contact Editorial Office
          </Link>
        </div>

        <div style={{ padding: '22px 26px', background: 'rgba(196,162,76,0.08)', borderLeft: '3px solid #C4A24C', borderRadius: '0 4px 4px 0', color: '#0B1B3A' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 28px)', margin: '0 0 10px' }}>
            Our Commitment
          </h2>
          <p style={{ fontSize: 'clamp(15.5px, 1.5vw, 17px)', lineHeight: 1.7, margin: 0 }}>
            <strong>Asgard Research Publication</strong> is dedicated to promoting ethical research, responsible publishing, and academic excellence. We strive to provide a transparent, fair, and trustworthy publishing environment for researchers around the world.
          </p>
        </div>
      </div>
    </>
  )
}

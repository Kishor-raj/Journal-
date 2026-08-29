const ETHICS = [
  {
    title: 'Authorship',
    body: 'Authorship is limited to those who have made a substantial contribution to the conception, execution, or interpretation of the reported study. All contributors must be acknowledged and all listed authors must approve the final manuscript.',
  },
  {
    title: 'Plagiarism',
    body: 'All submissions are screened with similarity-detection software. Manuscripts containing plagiarised or redundantly published material are rejected, and confirmed cases are reported to the authors\u2019 institutions.',
  },
  {
    title: 'Conflicts of interest',
    body: 'Authors, reviewers, and editors must declare any financial or personal relationship that could be perceived to influence the work. Editors recuse themselves from handling manuscripts where a conflict exists.',
  },
  {
    title: 'Research integrity',
    body: 'Studies involving human subjects must include evidence of institutional ethics approval and informed consent. Data and analysis code should be available to reviewers on request.',
  },
  {
    title: 'Corrections & retractions',
    body: 'We publish corrections, expressions of concern, and retractions in line with COPE guidance. Retraction notices remain permanently linked to the original article.',
  },
  {
    title: 'Reviewer conduct',
    body: 'Reviewers must treat manuscripts as confidential documents, provide constructive and evidence-based assessments, and decline invitations where they cannot review objectively.',
  },
]

export default function PublicationEthics() {
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
            Policy
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Publication Ethics
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Standards for authors, reviewers, and editors
          </p>
        </div>
      </div>

      {/* Ethics cards */}
      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        <p style={{ fontSize: 'clamp(16px, 1.6vw, 18px)', lineHeight: 1.8, color: '#3A4157', maxWidth: '760px', margin: '0 0 48px' }}>
          Asgard Publications follows the Committee on Publication Ethics (COPE) Core Practices. All parties involved in publication — authors, editors, reviewers, and the publisher — are expected to uphold the standards below.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))', gap: '26px' }}>
          {ETHICS.map(e => (
            <section key={e.title} style={{
              background: '#FFFFFF',
              border: '1px solid #E6E1D6',
              borderTop: '3px solid #0B1B3A',
              padding: '32px 30px',
            }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 27px)', color: '#0B1B3A', margin: '0 0 14px' }}>
                {e.title}
              </h2>
              <p style={{ fontSize: '16.5px', lineHeight: 1.75, color: '#3A4157', margin: 0 }}>
                {e.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}

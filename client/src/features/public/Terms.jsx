import { Link } from 'react-router-dom'

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

function TermsCard({ title, paragraphs, items }) {
  return (
    <article style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '26px 24px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 8px' }}>
        {title}
      </h3>
      <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
      {paragraphs?.map(paragraph => (
        <p key={paragraph} style={{ fontSize: '15px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 12px' }}>
          {paragraph}
        </p>
      ))}
      {items && (
        <div style={{ display: 'grid', gap: '11px' }}>
          {items.map(item => (
            <div key={item} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '12px', alignItems: 'start', fontSize: '15.5px', color: '#3A4157', lineHeight: 1.65 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4A24C', marginTop: '9px' }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export default function Terms() {
  return (
    <>
      <div style={{
        background: '#0B1B3A',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #C4A24C',
      }}>
        <div style={{ width: '100%', maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(28px, 3.5vw, 42px) var(--layout-pad)' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '16px' }}>
            Terms &amp; Conditions
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Guidelines and legal agreements governing the use of Asgard International Research Publication
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(24px, 4vw, 40px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', maxWidth: '860px', margin: '0 0 44px' }}>
          Welcome to <strong>Asgard International Research Publication</strong>. These Terms of Service regulate access to
          and use of our website, editorial management platform, submission portal, and published research articles.
          By creating an account, accessing our portal, or submitting manuscripts, you agree to be bound by these terms.
        </p>

        <section style={{ marginBottom: '52px', background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: 'clamp(24px, 4vw, 36px)', borderRadius: '0 4px 4px 0' }}>
          <SectionHeading>Agreement to Terms</SectionHeading>
          <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: 0 }}>
            By registering for an account or using any service provided by Asgard International Research Publication,
            you confirm that you are at least 18 years old (or have attained the age of legal majority in your jurisdiction),
            have read and understood these Terms of Service, and agree to comply with all applicable academic, legal,
            and regulatory requirements.
          </p>
        </section>

        <section style={{ marginBottom: '56px' }}>
          <SectionHeading>Core Principles &amp; Policies</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '28px' }}>
            <TermsCard
              title="User Accounts & Security"
              paragraphs={[
                'Users are responsible for safeguarding account credentials, passwords, and access tokens.',
                'You must supply authentic, accurate, and up-to-date professional and institutional affiliation details during registration.',
              ]}
              items={[
                'Do not share login credentials with third parties',
                'Notify editorial administrators immediately of unauthorized account access',
                'Impersonation of academic peers or researchers is strictly prohibited',
              ]}
            />
            <TermsCard
              title="Manuscript Submission & Warranties"
              paragraphs={[
                'Submitting authors warrant that the manuscript represents original scholarly research not currently under review elsewhere.',
                'All named co-authors must have contributed significantly and approved the submitted version.',
              ]}
              items={[
                'Full compliance with publication ethics and COPE standards',
                'No plagiarized material, manipulated data, or fabricated citations',
                'All potential conflicts of interest must be disclosed upon submission',
              ]}
            />
            <TermsCard
              title="Peer Review & Editorial Authority"
              paragraphs={[
                'Submitted manuscripts undergo peer evaluation by qualified academic reviewers.',
                'The Editor-in-Chief and editorial board retain final discretionary authority regarding manuscript acceptance, revisions, or rejection.',
              ]}
              items={[
                'Peer review feedback is provided constructively to enhance scientific merit',
                'Reviewers and editors adhere to strict confidentiality guidelines',
                'Appeals against editorial decisions must follow our formal editorial appeal procedure',
              ]}
            />
            <TermsCard
              title="Open Access & Copyright"
              paragraphs={[
                'Asgard International Research Publication is dedicated to open access dissemination of scholarly research.',
                'Published articles are distributed under standard Creative Commons licensing (such as CC BY 4.0), permitting open sharing with proper attribution.',
              ]}
              items={[
                'Authors retain copyright of their scholarly work',
                'The journal is granted an exclusive initial publication license and distribution rights',
                'Readers enjoy unrestricted public access to read, download, and cite published articles',
              ]}
            />
            <TermsCard
              title="Prohibited Activities"
              paragraphs={[
                'Users must not compromise the integrity, availability, or security of the journal platform.',
              ]}
              items={[
                'Attempting to bypass authentication or peer review workflows',
                'Automated scraping or denial-of-service activities targeting our systems',
                'Uploading malicious software, corrupted files, or inappropriate content',
              ]}
            />
            <TermsCard
              title="Limitation of Liability"
              paragraphs={[
                'Scholarly papers and editorial contents represent the findings and views of their respective authors, not the official stance of the publisher.',
                'The journal platform is provided on an "as is" and "as available" basis without warranties of continuous, error-free operation.',
              ]}
            />
          </div>
        </section>

        <section style={{ marginBottom: '52px' }}>
          <SectionHeading>Inquiries &amp; Legal Notices</SectionHeading>
          <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#555E75', margin: '0 0 24px' }}>
            We may revise these Terms of Service from time to time to reflect evolving publishing standards, legal obligations,
            or platform features. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.
          </p>
          <div style={{ padding: '22px 26px', background: 'rgba(196,162,76,0.08)', borderLeft: '3px solid #C4A24C', borderRadius: '0 4px 4px 0', color: '#0B1B3A' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 28px)', margin: '0 0 10px' }}>
              Contact Editorial Office
            </h2>
            <p style={{ fontSize: 'clamp(15.5px, 1.5vw, 17px)', lineHeight: 1.7, margin: 0 }}>
              For questions regarding these Terms of Service, submission policies, or copyright inquiries, reach us via our{' '}
              <Link to="/contact" style={{ color: '#9A7B23', textDecoration: 'none' }}>contact page</Link>{' '}
              or email our executive team at ceo@ijidcr-asgard.in.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

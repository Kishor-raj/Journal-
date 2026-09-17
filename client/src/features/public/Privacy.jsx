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

function PolicyCard({ title, paragraphs, items }) {
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

export default function Privacy() {
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
            Privacy Policy
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            How Asgard Research Publication handles your information
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(24px, 4vw, 40px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', maxWidth: '860px', margin: '0 0 44px' }}>
          <strong>Asgard Research Publication</strong> respects your privacy. This policy explains what
          information the website collects, how it is used, and the choices you have regarding
          analytics and cookies.
        </p>

        <section style={{ marginBottom: '52px', background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: 'clamp(24px, 4vw, 36px)', borderRadius: '0 4px 4px 0' }}>
          <SectionHeading>Website Analytics</SectionHeading>
          <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: 0 }}>
            We use an anonymous first-party visitor identifier to estimate unique website
            visitors and display aggregated visitor statistics. The identifier is not
            intended to identify individual users and is not used for advertising or
            profiling.
          </p>
        </section>

        <section style={{ marginBottom: '56px' }}>
          <SectionHeading>Information We Collect</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '28px' }}>
            <PolicyCard
              title="Anonymous Visitor Identifier"
              paragraphs={[
                'When you accept analytics, a randomly generated identifier (a UUID) is created and stored in a first-party cookie named visitor_id on your browser.',
                'This identifier is used solely to recognize that a browser has visited before, so aggregated visitor counts are not inflated by page refreshes or navigation between pages.',
              ]}
              items={[
                'Not your name, email, phone number, or account ID',
                'Not your IP address or browser fingerprint',
                'No other personally identifying information',
              ]}
            />
            <PolicyCard
              title="Aggregated Visitor Statistics"
              paragraphs={[
                'The website stores the identifier and the first and last visit timestamps in order to compute the displayed total visitor count.',
                'Only the aggregated total is exposed to the public; individual visitor records are never published.',
              ]}
            />
            <PolicyCard
              title="Other Information"
              paragraphs={[
                'Information you actively provide through forms (such as the contact form or author registration) is used for the purpose for which it was submitted.',
                'Standard server logs may record technical details such as request time and response status to maintain reliability and security.',
              ]}
            />
          </div>
        </section>

        <section style={{ marginBottom: '52px' }}>
          <SectionHeading>Cookies &amp; Consent</SectionHeading>
          <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#555E75', margin: '0 0 24px' }}>
            The only analytics-related cookie used on this site is the anonymous visitor_id
            cookie described above. It is set only after you accept analytics and lasts for
            approximately one year. You may accept, reject, or change your choice at any time;
            rejecting analytics does not affect the rest of the website.
          </p>
          <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#3A4157', margin: '0 0 40px' }}>
            Please review the applicable cookie and privacy requirements in your jurisdiction
            for complete compliance guidance.
          </p>
          <div style={{ padding: '22px 26px', background: 'rgba(196,162,76,0.08)', borderLeft: '3px solid #C4A24C', borderRadius: '0 4px 4px 0', color: '#0B1B3A' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 28px)', margin: '0 0 10px' }}>
              Contact Us
            </h2>
            <p style={{ fontSize: 'clamp(15.5px, 1.5vw, 17px)', lineHeight: 1.7, margin: 0 }}>
              If you have questions about this privacy policy or your data, contact us via the{' '}
              <Link to="/contact" style={{ color: '#9A7B23', textDecoration: 'none' }}>contact page</Link>{' '}
              or by email at ceo@ijidcr-asgard.in.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
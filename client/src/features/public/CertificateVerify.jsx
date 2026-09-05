import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicService } from '../../services/publicService.js'

const JOURNAL_INFO = {
  name: 'International Journal of Intelligent Digital Computing Research (IJIDCR)',
  shortName: 'IJIDCR',
}

function StatusCard({ status, data }) {
  const isActive = status === 'active'
  const isRevoked = status === 'revoked'
  const isValid = isActive

  return (
    <div
      style={{
        maxWidth: '620px',
        margin: '40px auto',
        background: '#FFFFFF',
        border: '1px solid #E4DFD3',
        borderRadius: '14px',
        padding: '36px 40px',
        textAlign: 'center',
        boxShadow: '0 6px 24px rgba(11,27,58,0.08)',
      }}
    >
      <div style={{ fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0B1B3A', fontFamily: 'Jost, sans-serif', fontWeight: 600, marginBottom: '6px' }}>
        IJIDCR · Official Verification
      </div>

      {isValid ? (
        <>
          <div style={{ fontSize: '46px', margin: '20px 0 8px' }}>✅</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#1A7F4B', fontFamily: 'Jost, sans-serif', letterSpacing: '0.02em' }}>
            VALID CERTIFICATE
          </div>
          <div style={{ color: '#0B1B3A', fontSize: '14px', marginTop: '10px' }}>
            This Certificate of Publication is authentic and issued by IJIDCR.
          </div>
        </>
      ) : isRevoked ? (
        <>
          <div style={{ fontSize: '46px', margin: '20px 0 8px' }}>⚠️</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#B4552D', fontFamily: 'Jost, sans-serif', letterSpacing: '0.02em' }}>
            CERTIFICATE REVOKED
          </div>
          <div style={{ color: '#0B1B3A', fontSize: '14px', marginTop: '10px' }}>
            This certificate is no longer valid.
            {data?.revoked_at && ` Revoked on ${new Date(data.revoked_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '46px', margin: '20px 0 8px' }}>🔍</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#9A7B23', fontFamily: 'Jost, sans-serif', letterSpacing: '0.02em' }}>
            CERTIFICATE NOT AVAILABLE
          </div>
          <div style={{ color: '#0B1B3A', fontSize: '14px', marginTop: '10px' }}>
            The certificate associated with this reference is being processed or could not be verified at this time.
          </div>
        </>
      )}

      {data?.certificate_number && (
        <div style={{ marginTop: '26px', padding: '14px 18px', background: '#FBF6EA', border: '1px solid #C4A24C', borderRadius: '10px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A7B23', fontWeight: 600, marginBottom: '8px' }}>
            Certificate Number
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B1B3A', fontFamily: 'Jost, sans-serif' }}>
            {data.certificate_number}
          </div>
        </div>
      )}

      {data?.manuscript?.title && (
        <div style={{ marginTop: '14px', textAlign: 'left' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0B1B3A', lineHeight: 1.5 }}>
            {data.manuscript.title}
          </div>
          <div style={{ fontSize: '12.5px', color: '#6B7280', marginTop: '4px' }}>
            Article No.: {data.manuscript.submission_number || '—'}
          </div>
        </div>
      )}

      {(data?.author?.first_name || data?.author?.last_name) && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#374151' }}>
          <strong>{[data.author.first_name, data.author.last_name].filter(Boolean).join(' ')}</strong>
          {data.author.email && ` · ${data.author.email}`}
        </div>
      )}

      {data?.publication && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#6B7280' }}>
          {data.journal?.name || JOURNAL_INFO.name} · Vol. {data.publication.volume}, Issue {data.publication.issue}, {data.publication.year}
        </div>
      )}
    </div>
  )
}

export default function CertificateVerify() {
  const { token } = useParams()
  const [state, setState] = useState({ loading: true, error: '', data: null })

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: 'Missing verification reference.' })
      return
    }
    publicService
      .getCertificateVerification(token)
      .then((data) => setState({ loading: false, data }))
      .catch(() => setState({ loading: false, error: 'Unable to verify this certificate. Please ensure the link is correct.' }))
  }, [token])

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 24px 80px', fontFamily: 'Jost, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#0B1B3A', fontFamily: 'Jost, sans-serif', letterSpacing: '0.02em' }}>
          Certificate Verification
        </div>
        <div style={{ color: '#6B7280', fontSize: '14px', marginTop: '6px' }}>
          Verify the authenticity of a Certificate of Publication issued by {JOURNAL_INFO.name}
        </div>
      </div>

      {state.loading ? (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>Verifying certificate...</div>
      ) : state.error ? (
        <div style={{ textAlign: 'center', color: '#B4552D', padding: '40px 0' }}>{state.error}</div>
      ) : (
        <StatusCard status={state.data?.status} data={state.data} />
      )}

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13.5px' }}>
        <Link to="/" style={{ color: '#9A7B23', textDecoration: 'underline' }}>
          ← Back to IJIDCR Home
        </Link>
      </div>
    </div>
  )
}
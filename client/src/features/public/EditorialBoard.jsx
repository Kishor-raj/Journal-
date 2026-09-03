import { useState } from 'react'
import { Link } from 'react-router-dom'

const EDITOR_IN_CHIEF = {
  role: 'Editor-in-Chief',
  name: 'Prof. Dr. Dinesh Senduraja',
  affiliation: 'Research Associate (RA), MED & CoS, Defence Research & Development Organisation (DRDO), Pune Zone - 411021 & Professor, Department of Computer Science, Government Arts and Science College, Veerapandi - 625534, Theni District, Tamil Nadu',
  personalEmail: 'neo12max@gmail.com',
  instEmail: 'dineshsendurja@drdo.in',
  orcid: 'https://orcid.org/0009-0002-7903-0378',
  googleScholar: 'https://scholar.google.co.in/citations?user=8RQre5QAAAAJ&hl=en',
}

const LEADERSHIP = [
  {
    role: 'Editorial Leadership',
    name: 'Prof. Dr. M. Sulthan Ibrahim',
    affiliation: 'Professor and Head, PG Department of Computer Science, Government Arts and Science College, Veerapandi - 625534, Theni District, Tamil Nadu',
    personalEmail: 'km.sulthan@gmail.com',
    orcid: 'https://orcid.org/0000-0003-2714-4517',
    googleScholar: 'https://scholar.google.com/citations?user=L7ZHIxEAAAAJ&hl=en',
  },
  {
    role: 'Editorial Leadership',
    name: 'Prof. Dr. L. Jerlin Rubini',
    affiliation: 'Professor, Department of Computer Science, Government Arts and Science College, Veerapandi - 625534, Theni District, Tamil Nadu',
    personalEmail: 'jel.jerlin@gmail.com',
    orcid: 'https://orcid.org/0000-0001-8635-7884',
  },
]

const EDITORIAL_BOARD_MEMBERS = [
  {
    role: 'Editorial Board Member',
    name: 'Dr. V. Isakkirajan',
    affiliation: 'Head & Assistant Professor, Department of Computer Science, P.K.N. Arts and Science College, Tirumangalam, Madurai, Tamil Nadu, India',
    personalEmail: 'virpknc@gmail.com',
    instEmail: 'cscpghod@pkncollege.edu.in',
    orcid: 'https://orcid.org/0009-0003-7503-9778',
  },
  {
    role: 'Editorial Board Member',
    name: 'Dr. S. Selvam MSc, MCA, MPhil, PhD',
    affiliation: 'Head and Assistant Professor, Department of Computer Science (Artificial Intelligence), Nadar Mahajan Sangam S Vellaichamy Nadar College, Nagamalai, Madurai - 625019, Tamil Nadu, India',
    personalEmail: 's.selvammphil@gmail.com',
    instEmail: 'selvam@nmssvnc.edu.in',
    profileLink: 'https://nmssvnc.edu.in/department/71/computer-science-artificial-intelligence#faculty',
    orcid: 'https://orcid.org/0000-0002-9482-0469',
  },
  {
    role: 'Editorial Board Member',
    name: 'Dr. M. Ilayaraja',
    affiliation: 'Kalasalingam Academy of Research and Education, Anand Nagar, Krishnankoil - 626126',
    personalEmail: 'ilayarajaalu@gmail.com',
    instEmail: 'ilayaraja.m@klu.ac.in',
    orcid: 'https://orcid.org/0000-0003-2611-2599',
  },
  {
    role: 'Editorial Board Member',
    name: 'Prof. M. Muthalagu',
    affiliation: 'Department of Computer Science, Madurai Kamaraj University College, Alagar Koil Road, Madurai - 625002',
    personalEmail: 'muthalagucs76@gmail.com',
    instEmail: 'mkucollegemd@gmail.com',
  },
]

const NATIONAL_BOARD = [
  {
    role: 'National Editorial Board',
    name: 'Dr. Thulasi Bikku',
    affiliation: 'Associate Professor, Department of Computer Science and Engineering, Amrita Vishwa Vidyapeetham, Amaravati Campus, Kuragallu, Mangalagiri, Guntur, Andhra Pradesh, India – 522503',
    instEmail: 'b_thulasi@av.amrita.edu',
  },
  {
    role: 'National Editorial Board',
    name: 'Prof. S. Ravi',
    affiliation: 'Department of Computer Science, School of Engineering and Technology, Pondicherry University, Pondicherry – 605014',
    personalEmail: 'sravicite@gmail.com',
    instEmail: 'sravicite@pondiuni.ac.in',
  },
  {
    role: 'National Editorial Board',
    name: 'Dr. N. Baskar',
    affiliation: 'Associate Professor, School of Information Science, Presidency University, Bengaluru – 560119',
    personalEmail: 'baskarsrkv@gmail.com',
  },
]

const INTERNATIONAL_BOARD = [
  {
    role: 'International Editorial Board',
    name: 'Dr. Saleem Raja. A',
    affiliation: 'Department of Computing and Information Sciences, University of Technology and Applied Sciences-Shinas, Sultanate of Oman',
    personalEmail: 'asaleemrajasec@gmail.com',
    instEmail: 'saleem.abdulsamad@utas.edu.om',
    orcid: 'https://orcid.org/0000-0002-7203-1426',
  },
  {
    role: 'International Editorial Board',
    name: 'Prof. Ts. Dr. Sri Devi Ravana, PhD (Melbourne)',
    affiliation: 'Director, Pusat Pembelajaran Integral, Centre for Integral Learning (CITRA), University Malaya, 50603 Kuala Lumpur, Malaysia',
    personalEmail: 'sdevi@um.edu.my',
  },
  {
    role: 'International Editorial Board',
    name: 'Dr. Arul Kumar Natarajan',
    affiliation: 'Program Head, Cybersecurity, Department of Cybersecurity, School of Computing, Samarkand International University of Technology (SIUT), Uzbekistan – 140100',
    personalEmail: 'itsprofarul@gmail.com',
    instEmail: 'arul.natarajan@siut.uz',
  },
]

const RESPONSIBILITIES = [
  'Ensuring the quality and originality of published research.',
  'Managing the peer-review process fairly and transparently.',
  'Maintaining publication ethics and research integrity.',
  'Making independent editorial decisions.',
  'Promoting academic excellence and innovation.',
  'Supporting authors and reviewers throughout the publication process.',
]

const PEER_REVIEW_CRITERIA = [
  'Originality',
  'Scientific Quality',
  'Technical Soundness',
  'Relevance to the Journal Scope',
  'Reviewer Recommendations',
  'Compliance with Publication Ethics',
]

const ETHICAL_COMMITMENTS = [
  'Maintain confidentiality throughout the review process.',
  'Avoid conflicts of interest.',
  'Ensure unbiased editorial decisions.',
  'Follow internationally recognized publication ethics.',
  'Promote transparency, fairness, and academic integrity.',
]

function BoardMemberCard({ member }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        padding: '24px 22px',
        borderRadius: '2px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 4px 14px rgba(11,27,58,0.06)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10.5px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '8px' }}>
          {member.role}
        </div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(18px, 1.8vw, 21px)', color: '#0B1B3A', margin: '0 0 8px' }}>
          {member.name}
        </h3>
        <p style={{ fontSize: '14px', color: '#3A4157', lineHeight: 1.6, margin: '0 0 14px' }}>
          {member.affiliation}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F0ECE3', fontSize: '12px' }}>
        {member.instEmail && (
          <a href={`mailto:${member.instEmail}`} style={{ color: '#0B1B3A', textDecoration: 'none', background: '#F4F5F8', padding: '3px 8px', borderRadius: '3px' }} title="Institutional Email">
            ✉️ {member.instEmail}
          </a>
        )}
        {member.personalEmail && !member.instEmail && (
          <a href={`mailto:${member.personalEmail}`} style={{ color: '#0B1B3A', textDecoration: 'none', background: '#F4F5F8', padding: '3px 8px', borderRadius: '3px' }} title="Personal Email">
            ✉️ {member.personalEmail}
          </a>
        )}
        {member.orcid && (
          <a href={member.orcid} target="_blank" rel="noopener noreferrer" style={{ color: '#5B8A00', fontWeight: 600, textDecoration: 'none', background: '#F4F8EC', padding: '3px 8px', borderRadius: '3px' }}>
            ORCID ↗
          </a>
        )}
        {member.googleScholar && (
          <a href={member.googleScholar} target="_blank" rel="noopener noreferrer" style={{ color: '#1A73E8', fontWeight: 500, textDecoration: 'none', background: '#ECF3FD', padding: '3px 8px', borderRadius: '3px' }}>
            Scholar ↗
          </a>
        )}
        {member.profileLink && (
          <a href={member.profileLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0B1B3A', fontWeight: 500, textDecoration: 'none', background: '#EAECEF', padding: '3px 8px', borderRadius: '3px' }}>
            Profile ↗
          </a>
        )}
      </div>
    </div>
  )
}

export default function EditorialBoard() {
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
            Governance &amp; Leadership
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Editorial Board
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Distinguished scholars and experts dedicated to research excellence and integrity
          </p>
        </div>
      </div>

      {/* Board body */}
      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        
        {/* Intro */}
        <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', maxWidth: '820px', margin: '0 0 44px' }}>
          The Editorial Board of Asgard Research Publication is committed to maintaining the highest standards of academic quality, integrity, and ethical publishing. Our editorial team consists of experienced researchers, academicians, and subject experts who oversee the peer-review process and ensure that every published article meets international scholarly standards.
        </p>

        {/* Section: Editor-in-Chief */}
        <div style={{ marginBottom: '52px' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '8px' }}>
            Editorial Leadership
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0B1B3A', margin: '0 0 6px' }}>
            Editor-in-Chief
          </h2>
          <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '24px' }} />

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E6E1D6',
            borderTop: '3px solid #C4A24C',
            padding: 'clamp(28px, 4vw, 40px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '28px 36px',
            boxShadow: '0 2px 10px rgba(11,27,58,0.04)',
          }}>
            <div style={{
              aspectRatio: '1',
              maxWidth: '160px',
              backgroundImage: 'repeating-linear-gradient(135deg, rgba(11,27,58,0.07) 0 2px, transparent 2px 9px)',
              border: '1px solid #E6E1D6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: '#6B7288',
              textAlign: 'center',
              padding: '12px',
            }}>
              EDITOR-IN-CHIEF
            </div>
            <div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '8px' }}>
                {EDITOR_IN_CHIEF.role}
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0B1B3A', margin: '0 0 10px' }}>
                {EDITOR_IN_CHIEF.name}
              </h3>
              <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: '#3A4157', margin: '0 0 18px' }}>
                {EDITOR_IN_CHIEF.affiliation}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '13px' }}>
                {EDITOR_IN_CHIEF.instEmail && (
                  <a href={`mailto:${EDITOR_IN_CHIEF.instEmail}`} style={{ color: '#0B1B3A', textDecoration: 'none', background: '#F4F5F8', padding: '6px 12px', borderRadius: '3px' }}>
                    ✉️ {EDITOR_IN_CHIEF.instEmail}
                  </a>
                )}
                {EDITOR_IN_CHIEF.personalEmail && (
                  <a href={`mailto:${EDITOR_IN_CHIEF.personalEmail}`} style={{ color: '#0B1B3A', textDecoration: 'none', background: '#F4F5F8', padding: '6px 12px', borderRadius: '3px' }}>
                    ✉️ {EDITOR_IN_CHIEF.personalEmail}
                  </a>
                )}
                {EDITOR_IN_CHIEF.orcid && (
                  <a href={EDITOR_IN_CHIEF.orcid} target="_blank" rel="noopener noreferrer" style={{ color: '#5B8A00', fontWeight: 600, textDecoration: 'none', background: '#F4F8EC', padding: '6px 12px', borderRadius: '3px' }}>
                    ORCID ↗
                  </a>
                )}
                {EDITOR_IN_CHIEF.googleScholar && (
                  <a href={EDITOR_IN_CHIEF.googleScholar} target="_blank" rel="noopener noreferrer" style={{ color: '#1A73E8', fontWeight: 500, textDecoration: 'none', background: '#ECF3FD', padding: '6px 12px', borderRadius: '3px' }}>
                    Google Scholar ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Additional Leadership */}
        <div style={{ marginBottom: '52px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
            Editorial Leadership Team
          </h2>
          <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
            {LEADERSHIP.map(m => <BoardMemberCard key={m.name} member={m} />)}
          </div>
        </div>

        {/* Section: Editorial Board Members */}
        <div style={{ marginBottom: '52px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
            Editorial Board Members
          </h2>
          <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
            {EDITORIAL_BOARD_MEMBERS.map(m => <BoardMemberCard key={m.name} member={m} />)}
          </div>
        </div>

        {/* Section: National Editorial Board */}
        <div style={{ marginBottom: '52px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
            National Editorial Board
          </h2>
          <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
            {NATIONAL_BOARD.map(m => <BoardMemberCard key={m.name} member={m} />)}
          </div>
        </div>

        {/* Section: International Editorial Board */}
        <div style={{ marginBottom: '52px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
            International Editorial Board
          </h2>
          <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
            {INTERNATIONAL_BOARD.map(m => <BoardMemberCard key={m.name} member={m} />)}
          </div>
        </div>

        {/* Section: Editorial Responsibilities */}
        <div style={{ marginBottom: '52px', background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: 'clamp(24px, 4vw, 36px)', borderRadius: '0 4px 4px 0' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 16px' }}>
            Editorial Responsibilities
          </h2>
          <p style={{ fontSize: '15.5px', color: '#555E75', marginBottom: '16px' }}>
            The Editorial Board is responsible for:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {RESPONSIBILITIES.map((r, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px', fontSize: '15px', lineHeight: 1.7, color: '#3A4157' }}>
                <span style={{ color: '#C4A24C', fontWeight: 700, fontSize: '18px', lineHeight: 1.2 }}>•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section: Peer Review Policy & Ethical Commitment */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '32px', marginBottom: '52px' }}>
          
          <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '30px 28px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 10px' }}>
              Peer Review Policy
            </h3>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', marginBottom: '14px' }}>
              All submitted manuscripts undergo a <strong>Double-Blind Peer Review</strong> process. Editorial decisions are based on:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {PEER_REVIEW_CRITERIA.map((c, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '14.5px', color: '#3A4157' }}>
                  <span style={{ color: '#C4A24C', fontWeight: 700 }}>✓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '30px 28px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 10px' }}>
              Ethical Commitment
            </h3>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', marginBottom: '14px' }}>
              Members of the Editorial Board are expected to:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {ETHICAL_COMMITMENTS.map((e, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', fontSize: '14.5px', lineHeight: 1.6, color: '#3A4157' }}>
                  <span style={{ color: '#C4A24C', fontWeight: 700, lineHeight: 1.2 }}>✓</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Section: Join the Editorial Board */}
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
        }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '8px' }}>
              Opportunities
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 28px)', margin: '0 0 10px' }}>
              Join the Editorial Board
            </h3>
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: '#C3CBDC', margin: 0 }}>
              Experienced researchers and academicians interested in serving on the Editorial Board are invited to submit their curriculum vitae (CV) and a brief summary of their research expertise for consideration.
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
              padding: '14px 28px',
              borderRadius: '2px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E3CB86'}
            onMouseLeave={e => e.currentTarget.style.background = '#C4A24C'}
          >
            Editorial Board →
          </Link>
        </div>

      </div>
    </>
  )
}

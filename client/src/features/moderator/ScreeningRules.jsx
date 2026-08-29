const RULES = [
  {
    icon: 'fa-bullseye',
    title: 'Scope Assessment',
    summary: "Verify that the manuscript's subject matter aligns with the journal's published scope statement. The manuscript should contribute to the journal's core disciplines.",
    items: [
      "Check the stated scope on the journal's About page",
      'The topic should fall within computing science, AI, software engineering, data science, cybersecurity, or computational theory',
      'Interdisciplinary work is acceptable if the primary contribution is computational',
      'If borderline, select "Needs Clarification" and consult the editor-in-chief',
    ],
  },
  {
    icon: 'fa-list-check',
    title: 'Completeness',
    summary: 'All required manuscript components must be present before forwarding. Missing items should result in a "Return to Author" decision with specific instructions.',
    items: [
      'Title page: full author names, affiliations, emails, ORCID, corresponding author marked',
      'Structured abstract: Background, Methods, Results, Conclusions (typically 200–300 words)',
      '3–6 keywords for indexing',
      'References in journal-specified style (APA, IEEE, etc.)',
      'All figures, tables, and supplementary files uploaded and referenced',
    ],
  },
  {
    icon: 'fa-text-height',
    title: 'Formatting',
    summary: "The manuscript should follow the journal's template. Minor formatting issues that don't affect readability can be noted but should not block approval.",
    items: [
      'Correct template used (downloadable from Submission Guidelines)',
      'Figures: minimum 300 DPI, numbered sequentially, captions below',
      'Tables: numbered sequentially, titles above, no vertical lines',
      'Word count within range for the declared article type',
      'PDF file is the primary submission format; no password protection',
    ],
  },
  {
    icon: 'fa-scale-balanced',
    title: 'Publication Ethics',
    summary: 'All submissions must include required ethics declarations. Any suspicion of misconduct (fabrication, falsification, plagiarism) must be documented and escalated.',
    items: [
      'Conflict of Interest: all authors must declare; "None declared" is acceptable',
      'Ethics approval: required for human/animal studies; IRB/ethics committee name and reference number',
      'Informed consent statement if human subjects are involved',
      'Funding sources and grant numbers declared',
      'If misconduct suspected: document evidence, do NOT contact the author directly — escalate to editor-in-chief',
    ],
  },
  {
    icon: 'fa-fingerprint',
    title: 'Plagiarism Check',
    summary: 'Run all submissions through a plagiarism detection tool. The similarity score alone is not decisive — examine the nature of matched text.',
    items: [
      'Use Turnitin or iThenticate; record the report ID',
      'Threshold: generally <20% total similarity is acceptable',
      'Exclude properly quoted text, common methods descriptions, and references from consideration',
      'Check for self-plagiarism: large blocks reused from authors\u2019 own prior publications without citation',
      'High similarity in core results/discussion sections is a serious concern — consider rejection',
    ],
  },
  {
    icon: 'fa-user-secret',
    title: 'Anonymization (Double-Blind)',
    summary: 'For double-blind review, the manuscript must not contain any information that could identify the authors to reviewers. This includes obvious and non-obvious identifiers.',
    items: [
      'Remove author names from the manuscript body, headers, and footers',
      'Remove affiliation names and addresses',
      'Anonymize self-citations: replace "Author (2024)" style, remove acknowledgements that identify the author',
      'Check PDF metadata (File > Properties): remove Author, Title metadata if identifying',
      'Check figure watermarks, file names, and supplementary data for identifiers',
    ],
  },
]

export default function ScreeningRules() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: '900px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px' }}>
          Screening Rules Reference
        </h1>
        <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>
          Guidelines and criteria for each screening area
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-start',
        padding: '14px 18px', borderRadius: '8px',
        background: '#EBF4FB', border: '1px solid #A8CCE8',
        fontSize: '13px', color: '#2E6B9E', marginBottom: '28px',
      }}>
        <i className="fas fa-book-open" style={{ marginTop: '1px', flexShrink: 0 }} />
        <span>Use this page as a reference during screening. These rules define the standard criteria for each check area and help ensure consistency across all moderators.</span>
      </div>

      {/* Rule cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {RULES.map(rule => <RuleCard key={rule.title} rule={rule} />)}
      </div>
    </div>
  )
}

function RuleCard({ rule }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E4E8',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Card title */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '16px 20px',
        borderBottom: '1px solid #E2E4E8',
        background: '#F9FAFB',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#EBF4FB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className={`fas ${rule.icon}`} style={{ fontSize: '14px', color: '#1B2A4A' }} />
        </div>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>{rule.title}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px 20px' }}>
        <p style={{ fontSize: '13px', color: '#5A5E6B', lineHeight: 1.65, margin: '0 0 16px' }}>
          {rule.summary}
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rule.items.map(item => (
            <li key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: '#1A1A2E', lineHeight: 1.55 }}>
              <i className="fas fa-check" style={{ fontSize: '11px', color: '#2B7A4B', marginTop: '3px', flexShrink: 0 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

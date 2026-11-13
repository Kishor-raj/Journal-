import { describe, it, expect } from 'vitest'
import {
  escapeXml,
  extractValidOrcid,
  generateCrossrefDepositXml,
  validateCrossrefConfig,
  parseCrossrefSubmissionLog,
  sanitizeCrossrefResponse,
} from './crossref.service.js'

describe('Crossref Service - XML Escaping & ORCID Normalization', () => {
  it('escapes XML special characters correctly', () => {
    expect(escapeXml('A & B')).toBe('A &amp; B')
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;')
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;')
    expect(escapeXml("it's")).toBe('it&apos;s')
    expect(escapeXml('normal text')).toBe('normal text')
    expect(escapeXml('')).toBe('')
    expect(escapeXml(null)).toBe('')
    expect(escapeXml(undefined)).toBe('')
    expect(escapeXml(123)).toBe('123')
  })

  it('normalizes valid ORCID formats to 16-character identifier', () => {
    expect(extractValidOrcid('0000-0002-1825-0097')).toBe('0000-0002-1825-0097')
    expect(extractValidOrcid('https://orcid.org/0000-0002-1825-0097')).toBe('0000-0002-1825-0097')
    expect(extractValidOrcid('http://orcid.org/0000-0002-1825-0097')).toBe('0000-0002-1825-0097')
    expect(extractValidOrcid('0000-0001-2345-678X')).toBe('0000-0001-2345-678X')
  })

  it('returns null for invalid ORCIDs', () => {
    expect(extractValidOrcid('')).toBeNull()
    expect(extractValidOrcid(null)).toBeNull()
    expect(extractValidOrcid('12345')).toBeNull()
    expect(extractValidOrcid('0000-0002-1825-009Z')).toBeNull()
    expect(extractValidOrcid('not-an-orcid')).toBeNull()
  })
})

describe('Crossref Service - Deposit XML Generation (Crossref 5.3.1)', () => {
  const basePayload = {
    batchId: 'batch-20261112-test-0001',
    timestamp: 1731430000000,
    depositorName: 'IJIDCR Editorial Office',
    depositorEmail: 'editor@ijidcr.com',
    registrant: 'IJIDCR Publishing',
    journal: {
      title: 'International Journal of Intelligent Digital Computing Research',
      shortTitle: 'IJIDCR',
      issnOnline: '2654-6725',
      issnPrint: null,
    },
    publication: {
      volume: 1,
      issue: 1,
      year: 2026,
      month: 9,
      day: 15,
      doi: '10.68968/IJIDCR_00001',
      articleLandingUrl: 'https://ijidcr.com/articles/manuscript-uuid-1',
    },
    manuscript: {
      title: 'Advances in Deep Reinforcement Learning & Neural Search',
      submissionNumber: 'IJIDCR-26-0001',
      authors: [
        {
          first_name: 'Jane',
          last_name: 'Doe',
          orcid_id: '0000-0002-1825-0097',
        },
        {
          first_name: 'John',
          last_name: 'Smith',
          orcid_id: null,
        },
      ],
    },
  }

  it('generates valid Crossref 5.3.1 XML with required elements', () => {
    const xml = generateCrossrefDepositXml(basePayload)

    // Check schema version and namespace
    expect(xml).toContain('version="5.3.1"')
    expect(xml).toContain('xmlns="http://www.crossref.org/schema/5.3.1"')

    // Check depositor
    expect(xml).toContain('<depositor_name>IJIDCR Editorial Office</depositor_name>')
    expect(xml).toContain('<email_address>editor@ijidcr.com</email_address>')

    // Check journal metadata
    expect(xml).toContain('<full_title>International Journal of Intelligent Digital Computing Research</full_title>')
    expect(xml).toContain('<abbrev_title>IJIDCR</abbrev_title>')
    expect(xml).toContain('<issn media_type="electronic">2654-6725</issn>')

    // Check journal issue & volume
    expect(xml).toContain('<volume>1</volume>')
    expect(xml).toContain('<issue>1</issue>')

    // Check article metadata & escaping
    expect(xml).toContain('<title>Advances in Deep Reinforcement Learning &amp; Neural Search</title>')

    // Check contributors
    expect(xml).toContain('sequence="first" contributor_role="author"')
    expect(xml).toContain('<given_name>Jane</given_name>')
    expect(xml).toContain('<ORCID authenticated="false">https://orcid.org/0000-0002-1825-0097</ORCID>')

    expect(xml).toContain('sequence="additional" contributor_role="author"')
    expect(xml).toContain('<given_name>John</given_name>')
    expect(xml).toContain('<surname>Smith</surname>')

    // Check DOI and landing URL
    expect(xml).toContain('<doi>10.68968/IJIDCR_00001</doi>')
    expect(xml).toContain('<resource>https://ijidcr.com/articles/manuscript-uuid-1</resource>')
    expect(xml).toContain('<item_number>IJIDCR-26-0001</item_number>')
  })

  it('handles single-name author by setting surname per Crossref schema requirements', () => {
    const singleAuthorPayload = {
      ...basePayload,
      manuscript: {
        ...basePayload.manuscript,
        authors: [
          {
            first_name: null,
            last_name: 'Plato',
          },
        ],
      },
    }

    const xml = generateCrossrefDepositXml(singleAuthorPayload)
    expect(xml).toContain('<surname>Plato</surname>')
    expect(xml).not.toContain('<given_name>')
  })

  it('includes print ISSN when configured', () => {
    const printPayload = {
      ...basePayload,
      journal: {
        ...basePayload.journal,
        issnPrint: '2654-6733',
      },
    }

    const xml = generateCrossrefDepositXml(printPayload)
    expect(xml).toContain('<issn media_type="electronic">2654-6725</issn>')
    expect(xml).toContain('<issn media_type="print">2654-6733</issn>')
  })

  it('throws error if required fields are missing', () => {
    expect(() => generateCrossrefDepositXml({ ...basePayload, doi: '', publication: { ...basePayload.publication, doi: '' } })).toThrow(/DOI is required/)
    expect(() => generateCrossrefDepositXml({ ...basePayload, articleLandingUrl: '', publication: { ...basePayload.publication, articleLandingUrl: '', article_url: '' } })).toThrow(/article landing URL is required/)
  })
})

describe('Crossref Service - Safety Gates & Configuration Validation', () => {
  it('blocks production deposit when CROSSREF_PRODUCTION_DEPOSITS_ENABLED is not true', () => {
    expect(() => validateCrossrefConfig('production')).toThrow(/BLOCKED/)
  })

  it('validates test configuration successfully when in test environment', () => {
    const res = validateCrossrefConfig('test')
    expect(res.isProduction).toBe(false)
    expect(res.depositUrl).toContain('crossref.org')
  })

  it('validates production configuration throws when deposits enabled flag is false', () => {
    expect(() => validateCrossrefConfig('production')).toThrow(/BLOCKED/)
  })
})

describe('Crossref Service - Submission Log Diagnostics & Sanitization', () => {
  it('parses successful submission log with zero record failures', () => {
    const sampleLog = `<?xml version="1.0" encoding="UTF-8"?>
<crossref_result xmlns="http://www.crossref.org/qrschema/3.0" version="3.0">
  <record_count>1</record_count>
  <success_count>1</success_count>
  <failure_count>0</failure_count>
  <batch_id>batch-12345</batch_id>
  <record_diagnostic status="Success">
    <doi>10.68968/IJIDCR_00001</doi>
    <msg>Successfully added</msg>
  </record_diagnostic>
</crossref_result>`

    const parsed = parseCrossrefSubmissionLog(sampleLog)
    expect(parsed.isSuccess).toBe(true)
    expect(parsed.isPending).toBe(false)
    expect(parsed.isFailure).toBe(false)
    expect(parsed.summary).toContain('Successfully registered')
  })

  it('parses failed submission log with record diagnostics', () => {
    const sampleFailedLog = `<?xml version="1.0" encoding="UTF-8"?>
<crossref_result version="3.0">
  <record_count>1</record_count>
  <success_count>0</success_count>
  <failure_count>1</failure_count>
  <batch_id>batch-999</batch_id>
  <record_diagnostic status="Failure">
    <doi>10.68968/IJIDCR_00001</doi>
    <msg>Record not processed because [Title already registered with different DOI]</msg>
  </record_diagnostic>
</crossref_result>`

    const parsed = parseCrossrefSubmissionLog(sampleFailedLog)
    expect(parsed.isSuccess).toBe(false)
    expect(parsed.isFailure).toBe(true)
    expect(parsed.isPending).toBe(false)
    expect(parsed.error).toContain('Title already registered')
  })

  it('identifies pending submission logs where diagnostics are not yet available', () => {
    const pendingLog = 'Submission is currently being processed by Crossref processing queue'
    const parsed = parseCrossrefSubmissionLog(pendingLog)
    expect(parsed.isSuccess).toBe(false)
    expect(parsed.isPending).toBe(true)
    expect(parsed.isFailure).toBe(false)
  })

  it('sanitizes passwords and secrets in responses and error messages', () => {
    const sensitive = 'Basic dXNlcjpzZWNyZXQ= password=mySuperSecretPass&other=123'
    const sanitized = sanitizeCrossrefResponse(sensitive)
    expect(sanitized).not.toContain('mySuperSecretPass')
    expect(sanitized).toContain('password=***REDACTED***')
  })
})

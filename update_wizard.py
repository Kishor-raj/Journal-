import re

with open('client/src/features/author/SubmissionWizard.jsx', 'r') as f:
    content = f.read()

# Replace step validations
content = content.replace('if (step === 1) {', 'if (step === 0) {')
content = content.replace('if (step === 3) {', 'if (step === 2) {')
content = content.replace('if (step === 5) {', 'if (step === 4) {')
content = content.replace('if (manuscript?.id && step > 0) {', 'if (manuscript?.id) {')

# Replace step renderings
content = content.replace('{step === 1 && (', '{step === 0 && (')
content = content.replace('{step === 2 && (', '{step === 1 && (')
content = content.replace('{step === 3 && (', '{step === 2 && (')
content = content.replace('{step === 4 && (', '{step === 3 && (')
content = content.replace('{step === 5 && (', '{step === 4 && (')

# Remove step 0 block completely
content = re.sub(r'\{step === 0 && \(\s*<div style=\{\{ textAlign: \'center\', padding: \'60px 0\' \}\}>\s*<h2 style=\{styles\.sectionTitle\}>Ready to Start</h2>\s*<p style=\{\{ color: \'var\(--color-text-muted\)\', marginBottom: \'24px\', fontSize: \'var\(--text-base\)\' \}\}>\s*A draft manuscript has been created\. Proceed to enter your manuscript details\.\s*</p>\s*<Button variant="primary" size="lg" onClick=\{handleNext\}>\s*Start Entering Details\s*</Button>\s*</div>\s*\)\}', '', content)

# Replace handlePrev
content = content.replace('if (step > 0) setStep(step - 1)', 'if (step > 0) setStep(step - 1)')

# Replace return block
new_return = """  return (
    <div className="content-area">
      <div className="page active" id="page-new-submission">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">New Submission</h1>
              <p className="page-subtitle">Submit a new manuscript for peer review — progress is saved automatically</p>
            </div>
          </div>
        </div>

        <div className="wizard-progress" id="wizardProgress">
          {STEPS.map((s, i) => (
            <div key={s.key} className="wizard-step" onClick={() => handleStepClick(i)} style={{ cursor: i <= step ? 'pointer' : 'default' }}>
              <div className={`wizard-num ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? <i className="fas fa-check"></i> : i + 1}
              </div>
              <div className={`wizard-step-label ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`wizard-line ${i < step ? 'done' : ''}`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-body wizard-content" id="wizardContent">
            {step === 0 && (
              <StepMetadata manuscript={manuscript || {}} onChange={handleManuscriptChange} errors={errors} />
            )}
            {step === 1 && (
              <StepAuthors manuscript={manuscript || {}} onChange={handleManuscriptChange} />
            )}
            {step === 2 && (
              <StepFiles manuscript={manuscript || {}} onChange={handleManuscriptChange} errors={errors} />
            )}
            {step === 3 && (
              <StepReview manuscript={manuscript || {}} />
            )}
            {step === 4 && (
              <StepDeclarations declarations={declarations} onChange={setDeclarations} errors={errors} />
            )}
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-md)'}} id="wizardNav">
          <button className="btn btn-secondary" id="wizPrev" disabled={step === 0} onClick={handlePrev}>
            <i className="fas fa-arrow-left"></i> Previous
          </button>
          
          <div style={{display: 'flex', gap: '8px'}}>
            {errors.submit && (
              <span style={{color: 'var(--danger)', alignSelf: 'center', marginRight: '10px'}}>{errors.submit}</span>
            )}
            <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
              <i className="fas fa-save"></i> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" id="wizNext" onClick={handleNext}>
                Next Step <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button className="btn btn-primary" id="wizNext" onClick={handleSubmit} disabled={submitting}>
                <i className="fas fa-paper-plane"></i> {submitting ? 'Submitting...' : 'Submit Manuscript'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}"""

content = re.sub(r'  return \(\s*<div style=\{styles\.page\}>.*$', new_return, content, flags=re.DOTALL)

# Add import './AuthorDashboard.css' near top
content = content.replace("import FileUpload from '../../shared/components/FileUpload'", "import FileUpload from '../../shared/components/FileUpload'\nimport './AuthorDashboard.css'")


with open('client/src/features/author/SubmissionWizard.jsx', 'w') as f:
    f.write(content)

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyManuscripts, createDraft } from './services/manuscriptService'

export default function NewSubmissionRedirect() {
  const navigate = useNavigate()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      try {
        const manuscripts = await getMyManuscripts()
        const drafts = manuscripts.filter((m) => m.current_status === 'draft')
        const emptyDraft = drafts.find((d) => !d.title || d.title.trim() === '')
        if (emptyDraft) {
          navigate(`/author/submit/${emptyDraft.id}`, { replace: true })
          return
        }
        const newDraft = await createDraft()
        navigate(`/author/submit/${newDraft.id}`, { replace: true })
      } catch {
        navigate('/author/dashboard')
      }
    }
    init()
  }, [navigate])

  return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'inherit' }}>Preparing your submission...</div>
}

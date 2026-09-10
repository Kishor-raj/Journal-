import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../../shared/components/PageHeader'
import Button from '../../shared/components/Button'
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminArticleTypes,
  createArticleType,
  updateArticleType,
  deleteArticleType,
} from '../../services/adminService'

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: 'clamp(20px, 3vw, 40px)',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    borderBottom: '2px solid var(--color-rule-grey)',
    marginBottom: '32px',
  },
  tab: (active) => ({
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: active ? 'var(--color-info, #2E6B9E)' : 'var(--color-text-muted)',
    borderBottom: active ? '2px solid var(--color-info, #2E6B9E)' : '2px solid transparent',
    marginBottom: '-2px',
    transition: 'all 0.15s ease',
  }),
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-ink-navy)',
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'var(--color-surface)',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: 'var(--color-vellum, #F9F8F6)',
    borderBottom: '1px solid var(--color-rule-grey)',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: 'var(--color-ink-black)',
    borderBottom: '1px solid var(--color-rule-grey)',
    verticalAlign: 'middle',
  },
  badge: (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
    background: active ? 'rgba(43,122,75,0.1)' : 'rgba(184,51,51,0.1)',
    color: active ? 'var(--color-success, #2B7A4B)' : 'var(--color-danger, #B83333)',
  }),
  actionRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  iconBtn: (variant) => ({
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    border: variant === 'danger' ? '1px solid rgba(184,51,51,0.4)' : '1px solid var(--color-rule-grey)',
    borderRadius: '6px',
    cursor: 'pointer',
    background: variant === 'danger' ? 'rgba(184,51,51,0.06)' : 'var(--color-surface)',
    color: variant === 'danger' ? 'var(--color-danger,#B83333)' : 'var(--color-ink-navy)',
    transition: 'all 0.15s ease',
  }),
  emptyRow: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    background: 'var(--color-surface)',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-ink-navy)',
    marginBottom: '24px',
  },
  formGroup: { marginBottom: '18px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
    resize: 'vertical',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '18px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
  },
  errorBanner: {
    background: 'rgba(184,51,51,0.08)',
    border: '1px solid rgba(184,51,51,0.3)',
    color: '#7A1A1A',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  spinner: {
    textAlign: 'center',
    padding: '48px',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  sortInput: {
    width: '90px',
    padding: '9px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div style={styles.modalOverlay} onClick={onCancel}>
      <div style={{ ...styles.modal, maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: '15px', color: 'var(--color-ink-black)', lineHeight: 1.6, marginBottom: '24px' }}>
          {message}
        </p>
        <div style={styles.modalActions}>
          <button style={styles.iconBtn('default')} onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            style={{ ...styles.iconBtn('danger'), background: 'var(--color-danger,#B83333)', color: '#fff', border: 'none' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getAdminCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load categories.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setForm({ name: '', description: '', is_active: true })
    setFormError('')
    setModal({ mode: 'add' })
  }

  const openEdit = (item) => {
    setForm({ name: item.name, description: item.description || '', is_active: item.is_active })
    setFormError('')
    setModal({ mode: 'edit', item })
  }

  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (modal.mode === 'add') {
        const created = await createCategory({ name: form.name.trim(), description: form.description || null })
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      } else {
        const updated = await updateCategory(modal.item.id, {
          name: form.name.trim(),
          description: form.description || null,
          is_active: form.is_active,
        })
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
        )
      }
      closeModal()
    } catch (err) {
      setFormError(err?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCategory(deleteTarget.id)
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteTarget(null)
      alert(err?.message || 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const updated = await updateCategory(item.id, { is_active: !item.is_active })
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch {
      alert('Failed to update status.')
    }
  }

  return (
    <div>
      <div style={styles.toolbar}>
        <div>
          <h2 style={styles.sectionTitle}>Subject Categories ({categories.length})</h2>
          <p style={{ ...styles.hint, marginTop: '4px' }}>These populate the "Subject / Category" dropdown in the author submission form.</p>
        </div>
        <Button variant="primary" onClick={openAdd}>+ Add Category</Button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={load}>Retry</span>
        </div>
      )}

      {loading ? (
        <div style={styles.spinner}>⏳ Loading categories…</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.emptyRow}>No categories yet. Click "+ Add Category" to create one.</td>
              </tr>
            ) : (
              categories.map((cat, idx) => (
                <tr key={cat.id} style={{ background: idx % 2 === 1 ? 'var(--color-vellum, #F9F8F6)' : undefined }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{cat.name}</td>
                  <td style={{ ...styles.td, color: 'var(--color-text-muted)' }}>
                    {cat.description || <em style={{ opacity: 0.4 }}>No description</em>}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.badge(cat.is_active)}>
                      {cat.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <button style={styles.iconBtn('default')} onClick={() => openEdit(cat)}>Edit</button>
                      <button
                        style={styles.iconBtn('default')}
                        onClick={() => handleToggleActive(cat)}
                        title={cat.is_active ? 'Hides from author dropdown' : 'Shows in author dropdown'}
                      >
                        {cat.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button style={styles.iconBtn('danger')} onClick={() => setDeleteTarget(cat)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{modal.mode === 'add' ? 'Add Category' : 'Edit Category'}</h2>
            {formError && <div style={styles.errorBanner}>{formError}</div>}
            <div style={styles.formGroup}>
              <label style={styles.label}>Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Computer Science"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
              <textarea
                style={styles.textarea}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this subject area…"
              />
            </div>
            {modal.mode === 'edit' && (
              <div style={styles.checkRow}>
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                />
                <label htmlFor="cat-active" style={{ fontSize: '14px', cursor: 'pointer' }}>
                  Active — visible in author submission dropdown
                </label>
              </div>
            )}
            <div style={styles.modalActions}>
              <button style={styles.iconBtn('default')} onClick={closeModal} disabled={saving}>Cancel</button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete category "${deleteTarget.name}"? If any manuscripts reference it, deletion will be blocked — deactivate it instead.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}

// ─── Article Types Tab ────────────────────────────────────────────────────────

function ArticleTypesTab() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0, is_active: true })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getAdminArticleTypes()
      .then((data) => setTypes(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load article types.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setForm({ name: '', description: '', sort_order: types.length + 1, is_active: true })
    setFormError('')
    setModal({ mode: 'add' })
  }

  const openEdit = (item) => {
    setForm({ name: item.name, description: item.description || '', sort_order: item.sort_order ?? 0, is_active: item.is_active })
    setFormError('')
    setModal({ mode: 'edit', item })
  }

  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (modal.mode === 'add') {
        const created = await createArticleType({ name: form.name.trim(), description: form.description || null, sort_order: parseInt(form.sort_order) || 0 })
        setTypes((prev) => [...prev, created].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99)))
      } else {
        const updated = await updateArticleType(modal.item.id, { name: form.name.trim(), description: form.description || null, sort_order: parseInt(form.sort_order) || 0, is_active: form.is_active })
        setTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99)))
      }
      closeModal()
    } catch (err) {
      setFormError(err?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteArticleType(deleteTarget.id)
      setTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteTarget(null)
      alert(err?.message || 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const updated = await updateArticleType(item.id, { is_active: !item.is_active })
      setTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch {
      alert('Failed to update status.')
    }
  }

  return (
    <div>
      <div style={styles.toolbar}>
        <div>
          <h2 style={styles.sectionTitle}>Article Types ({types.length})</h2>
          <p style={{ ...styles.hint, marginTop: '4px' }}>These populate the "Article Type" dropdown in the author submission form.</p>
        </div>
        <Button variant="primary" onClick={openAdd}>+ Add Article Type</Button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={load}>Retry</span>
        </div>
      )}

      {loading ? (
        <div style={styles.spinner}>⏳ Loading article types…</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '70px' }}>Order</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan={5} style={styles.emptyRow}>No article types yet. Click "+ Add Article Type" to create one.</td>
              </tr>
            ) : (
              types.map((t, idx) => (
                <tr key={t.id} style={{ background: idx % 2 === 1 ? 'var(--color-vellum, #F9F8F6)' : undefined }}>
                  <td style={{ ...styles.td, textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    {t.sort_order ?? '—'}
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{t.name}</td>
                  <td style={{ ...styles.td, color: 'var(--color-text-muted)' }}>
                    {t.description || <em style={{ opacity: 0.4 }}>No description</em>}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.badge(t.is_active)}>
                      {t.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <button style={styles.iconBtn('default')} onClick={() => openEdit(t)}>Edit</button>
                      <button style={styles.iconBtn('default')} onClick={() => handleToggleActive(t)}>
                        {t.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button style={styles.iconBtn('danger')} onClick={() => setDeleteTarget(t)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{modal.mode === 'add' ? 'Add Article Type' : 'Edit Article Type'}</h2>
            {formError && <div style={styles.errorBanner}>{formError}</div>}
            <div style={styles.formGroup}>
              <label style={styles.label}>Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Original Research"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
              <textarea
                style={styles.textarea}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description for authors…"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Display Order</label>
              <input
                type="number"
                min="0"
                style={styles.sortInput}
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
              <p style={styles.hint}>Lower numbers appear first in the dropdown.</p>
            </div>
            {modal.mode === 'edit' && (
              <div style={styles.checkRow}>
                <input
                  type="checkbox"
                  id="type-active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                />
                <label htmlFor="type-active" style={{ fontSize: '14px', cursor: 'pointer' }}>
                  Active — visible in author submission dropdown
                </label>
              </div>
            )}
            <div style={styles.modalActions}>
              <button style={styles.iconBtn('default')} onClick={closeModal} disabled={saving}>Cancel</button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete article type "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { key: 'categories', label: '📂 Subject Categories' },
]

export default function JournalSettings() {
  const [activeTab, setActiveTab] = useState('categories')

  return (
    <div style={styles.page}>
      <PageHeader
        title="Journal Settings"
        subtitle="Manage the dropdown options authors see in the submission form. Changes apply to the author portal immediately."
      />

      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            style={styles.tab(activeTab === t.key)}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'categories' && <CategoriesTab />}
    </div>
  )
}

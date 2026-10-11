/**
 * Admin User CSV Export Utilities
 * RFC 4180 compliant CSV generation, Excel UTF-8 BOM support,
 * and formula injection sanitization.
 */

export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return ''
  let str = String(value)
  if (str.trim() === '') return ''

  // Formula injection prevention: prefix dangerous trigger characters (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // RFC 4180 quoting: escape existing double quotes and wrap if string contains quotes, commas, or newlines
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`
  }

  return str
}

export function formatCsvDate(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
}

export function getExportFilename(role) {
  const dateStr = new Date().toISOString().split('T')[0]
  if (!role || role.toLowerCase() === 'all') {
    return `users_all_roles_${dateStr}.csv`
  }
  const cleanRole = role.toLowerCase().trim()
  const plural = cleanRole.endsWith('s') ? cleanRole : `${cleanRole}s`
  return `users_${plural}_${dateStr}.csv`
}

export const CSV_HEADERS = [
  'User ID',
  'Display Name',
  'First Name',
  'Last Name',
  'Email',
  'Role',
  'Reviewer ID',
  'Account Status',
  'Email Verified',
  'Phone',
  'Institution',
  'College',
  'Department',
  'State',
  'Country',
  'Course',
  'ORCID iD',
  'Bio',
  'Joined Date',
  'Updated Date',
  'Last Login',
]

export function generateUsersCsv(users) {
  const BOM = '\uFEFF'
  const rows = [CSV_HEADERS.map(sanitizeCsvCell).join(',')]

  for (const user of users) {
    const displayName = user.display_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || ''
    const roleName = user.role_name
      ? user.role_name.charAt(0).toUpperCase() + user.role_name.slice(1)
      : 'Author'
    const status = user.account_status
      ? user.account_status.charAt(0).toUpperCase() + user.account_status.slice(1)
      : 'Active'

    const row = [
      user.id,
      displayName,
      user.first_name || '',
      user.last_name || '',
      user.email || '',
      roleName,
      user.reviewer_id || '',
      status,
      user.is_email_verified ? 'Yes' : 'No',
      user.phone || '',
      user.institution || '',
      user.college || '',
      user.department || '',
      user.state || '',
      user.country || '',
      user.course || '',
      user.orcid_id || '',
      user.bio || '',
      formatCsvDate(user.created_at),
      formatCsvDate(user.updated_at),
      formatCsvDate(user.last_login),
    ]

    rows.push(row.map(sanitizeCsvCell).join(','))
  }

  return BOM + rows.join('\r\n')
}

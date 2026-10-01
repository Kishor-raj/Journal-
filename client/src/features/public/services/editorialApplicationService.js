import apiClient from '../../../services/apiClient.js'

export async function submitEditorialApplication(payload) {
  return apiClient.post('/editorial-board/applications', payload)
}

export async function getUploadSignature(fileType = 'cv') {
  return apiClient.post('/editorial-board/signature', { fileType })
}

export async function uploadToCloudinary(file, fileType = 'cv') {
  const sig = await getUploadSignature(fileType)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sig.api_key)
  formData.append('timestamp', sig.timestamp)
  formData.append('signature', sig.signature)
  formData.append('folder', sig.folder)
  formData.append('public_id', sig.public_id)

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`, {
    method: 'POST',
    body: formData,
  })

  const uploadData = await uploadRes.json()
  if (!uploadRes.ok) {
    throw new Error(uploadData.error?.message || 'Failed to upload file. Please try again.')
  }

  return {
    url: uploadData.secure_url || uploadData.url,
    public_id: uploadData.public_id,
    bytes: uploadData.bytes,
    format: uploadData.format,
    original_filename: file.name,
    mime_type: file.type,
  }
}

export async function getApplicationStatus(reference, email) {
  return apiClient.get(`/editorial-board/status/${encodeURIComponent(reference)}`, {
    params: email ? { email } : {},
  })
}

export async function submitClarification(reference, email, response) {
  return apiClient.post(`/editorial-board/applications/${encodeURIComponent(reference)}/clarification`, {
    email,
    response,
  })
}

export async function getPublicEditorialBoard() {
  return apiClient.get('/editorial-board/members')
}

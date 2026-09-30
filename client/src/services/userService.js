import apiClient from './apiClient'

export function getMyProfile() {
  return apiClient.get('/users/me')
}

export function searchUsers(query) {
  return apiClient.get(`/users/search?q=${encodeURIComponent(query)}&limit=10`)
}

export function updateMyProfile(data) {
  return apiClient.patch('/users/me/profile', data)
}

export function getUserPhotoSignature() {
  return apiClient.post('/users/me/photo-signature')
}

export async function uploadUserProfilePhoto(file) {
  const sig = await getUserPhotoSignature()

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
    throw new Error(uploadData.error?.message || 'Failed to upload photo to Cloudinary')
  }

  const imageUrl = uploadData.secure_url || uploadData.url
  return updateMyProfile({ profile_image_url: imageUrl })
}

export function removeUserProfilePhoto() {
  return apiClient.delete('/users/me/photo')
}

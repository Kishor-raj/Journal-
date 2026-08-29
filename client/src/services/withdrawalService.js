import apiClient from './apiClient'

export function requestWithdrawal(data) {
  return apiClient.post('/withdrawals', data)
}

export function getMyWithdrawals() {
  return apiClient.get('/withdrawals/mine')
}

export function getPendingWithdrawals() {
  return apiClient.get('/withdrawals/pending')
}

export function handleWithdrawal(withdrawalId, data) {
  return apiClient.patch(`/withdrawals/${withdrawalId}`, data)
}

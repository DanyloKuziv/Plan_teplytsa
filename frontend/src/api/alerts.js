import client from './client.js'

export async function getByGreenhouse(id, unreadOnly = false) {
  const { data } = await client.get(`/alerts/${id}`, {
    params: unreadOnly ? { unread_only: true } : {}
  })
  return data
}

export async function markRead(alertId) {
  const { data } = await client.patch(`/alerts/${alertId}/read`)
  return data
}

export async function markAllRead(ghId) {
  const { data } = await client.patch(`/alerts/${ghId}/read-all`)
  return data
}

export async function createAlert(ghId, type, message) {
  const { data } = await client.post(`/alerts/${ghId}`, { type, message })
  return data
}

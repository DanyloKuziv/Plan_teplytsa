import client from './client.js'

export async function getLatest(greenhouseId) {
  const { data } = await client.get(`/sensor-logs/${greenhouseId}/latest`)
  return data
}

export async function getHistory(greenhouseId, hours = 24) {
  const { data } = await client.get(`/sensor-logs/${greenhouseId}/history`, { params: { hours } })
  return data
}

export async function post(greenhouseId, payload) {
  const { data } = await client.post(`/sensor-logs/${greenhouseId}`, payload)
  return data
}

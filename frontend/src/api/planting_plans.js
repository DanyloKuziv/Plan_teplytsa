import client from './client.js'

export async function create(payload) {
  const { data } = await client.post('/planting-plans/', payload)
  return data
}

export async function getByGreenhouse(greenhouseId) {
  const { data } = await client.get('/planting-plans/', { params: { greenhouse_id: greenhouseId } })
  return data
}

export async function getById(id) {
  const { data } = await client.get(`/planting-plans/${id}`)
  return data
}

export async function getStatus(id) {
  const { data } = await client.get(`/planting-plans/${id}/status`)
  return data
}

export async function getForecast(id) {
  const { data } = await client.get(`/planting-plans/${id}/forecast`)
  return data
}

export async function getIrrigationSchedule(id) {
  const { data } = await client.get(`/planting-plans/${id}/irrigation-schedule`)
  return data
}

export async function getAnalytics(id) {
  const { data } = await client.get(`/planting-plans/${id}/analytics`)
  return data
}

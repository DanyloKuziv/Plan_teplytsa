import client from './client.js'

export async function getByGreenhouse(greenhouseId) {
  const { data } = await client.get('/zones/', { params: { greenhouse_id: greenhouseId } })
  return data
}

export async function create(payload) {
  const { data } = await client.post('/zones/', payload)
  return data
}

export async function update(id, payload) {
  const { data } = await client.patch(`/zones/${id}`, payload)
  return data
}

export async function remove(id) {
  const { data } = await client.delete(`/zones/${id}`)
  return data
}

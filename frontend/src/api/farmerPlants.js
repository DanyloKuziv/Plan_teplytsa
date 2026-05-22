import client from './client.js'

export async function getAll() {
  const { data } = await client.get('/farmer-plants/')
  return data
}

export async function create(payload) {
  const { data } = await client.post('/farmer-plants/', payload)
  return data
}

export async function update(id, payload) {
  const { data } = await client.patch(`/farmer-plants/${id}`, payload)
  return data
}

export async function remove(id) {
  const { data } = await client.delete(`/farmer-plants/${id}`)
  return data
}

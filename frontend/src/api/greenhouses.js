import client from './client.js'

export async function getAll() {
  const { data } = await client.get('/greenhouses/')
  return data
}

export async function getById(id) {
  const { data } = await client.get(`/greenhouses/${id}`)
  return data
}

export async function create(payload) {
  const { data } = await client.post('/greenhouses/', payload)
  return data
}

export async function update(id, payload) {
  const { data } = await client.patch(`/greenhouses/${id}`, payload)
  return data
}

export async function remove(id) {
  const { data } = await client.delete(`/greenhouses/${id}`)
  return data
}

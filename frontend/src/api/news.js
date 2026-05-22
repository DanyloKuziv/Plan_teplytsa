import client from './client.js'

export async function get(category, limit = 20) {
  const params = { limit }
  if (category) params.category = category
  const { data } = await client.get('/news/', { params })
  return data
}

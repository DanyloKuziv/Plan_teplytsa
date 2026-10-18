import client from './client.js'

export async function create(lead) {
  const { data } = await client.post('/leads/', lead)
  return data
}

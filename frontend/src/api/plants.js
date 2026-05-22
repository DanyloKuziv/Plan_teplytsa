import client from './client.js'

export async function getAll() {
  const { data } = await client.get('/plants/')
  return data
}

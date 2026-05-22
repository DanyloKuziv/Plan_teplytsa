import client from './client.js'

export async function get(plantId, region) {
  const params = {}
  if (plantId) params.plant_id = plantId
  if (region) params.region = region
  const { data } = await client.get('/market-prices/', { params })
  return data
}

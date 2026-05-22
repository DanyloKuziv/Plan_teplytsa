import client from './client.js'

export async function getFinancialSummary() {
  const { data } = await client.get('/users/me/financial-summary')
  return data
}

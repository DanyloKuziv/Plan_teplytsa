import client from './client.js'

export const getFloorPlan = (greenhouseId) =>
  client.get(`/greenhouses/${greenhouseId}/floor-plan`).then(r => r.data)

export const saveFloorPlan = (greenhouseId, payload) =>
  client.post(`/greenhouses/${greenhouseId}/floor-plan`, payload).then(r => r.data)

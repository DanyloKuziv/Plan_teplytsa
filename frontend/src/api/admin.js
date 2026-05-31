import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const adminClient = axios.create({ baseURL: API_URL })
adminClient.interceptors.request.use(cfg => {
  const t = localStorage.getItem('admin_jwt')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export const getStats          = ()             => adminClient.get('/admin/stats').then(r => r.data)
export const getUsers          = ()             => adminClient.get('/admin/users').then(r => r.data)
export const toggleAdmin       = (id)           => adminClient.patch(`/admin/users/${id}/toggle-admin`).then(r => r.data)
export const setSubscription   = (id, expires)  => adminClient.patch(`/admin/users/${id}/subscription`, { subscription_expires: expires }).then(r => r.data)
export const deleteUser        = (id)           => adminClient.delete(`/admin/users/${id}`)
export const getGreenhouses    = ()             => adminClient.get('/admin/greenhouses').then(r => r.data)
export const getAlerts         = ()             => adminClient.get('/admin/alerts').then(r => r.data)
export const getPlants         = ()             => adminClient.get('/admin/plants').then(r => r.data)
export const createPlant       = (payload)      => adminClient.post('/admin/plants', payload).then(r => r.data)
export const updatePlant       = (id, data)     => adminClient.patch(`/admin/plants/${id}`, data).then(r => r.data)
export const deletePlant       = (id)           => adminClient.delete(`/admin/plants/${id}`)
export const getNews           = ()             => adminClient.get('/admin/news').then(r => r.data)
export const createNews        = (payload)      => adminClient.post('/admin/news', payload).then(r => r.data)
export const updateNews        = (id, data)     => adminClient.patch(`/admin/news/${id}`, data).then(r => r.data)
export const deleteNews        = (id)           => adminClient.delete(`/admin/news/${id}`)

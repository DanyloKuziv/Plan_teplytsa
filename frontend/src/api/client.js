import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: API_URL
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('greenhouse_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      localStorage.removeItem('greenhouse_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client

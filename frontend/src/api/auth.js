import client from './client.js'

export async function login(email, password) {
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)
  const { data } = await client.post('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return data
}

export async function register(email, password, fullName) {
  const { data } = await client.post('/auth/register', {
    email,
    password,
    full_name: fullName
  })
  return data
}

export async function verifyEmail(email, code) {
  const { data } = await client.post('/auth/verify-email', { email, code })
  return data
}

export async function resendVerification(email) {
  const { data } = await client.post('/auth/resend-verification', { email })
  return data
}

export async function forgotPassword(email) {
  const { data } = await client.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(email, code, new_password) {
  const { data } = await client.post('/auth/reset-password', { email, code, new_password })
  return data
}

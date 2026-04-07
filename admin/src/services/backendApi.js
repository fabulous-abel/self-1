import axios from 'axios'

const DEFAULT_API_BASE = 'http://localhost:5000/api'
const DEFAULT_SOCKET_URL = 'http://localhost:5000'

function normalizeUrl(url) {
  return url ? url.replace(/\/+$/, '') : ''
}

function getBooleanEnv(name, defaultValue) {
  const value = import.meta.env[name]

  if (value === undefined) return defaultValue

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function getApiBase() {
  return normalizeUrl(import.meta.env.VITE_API_BASE_URL) || DEFAULT_API_BASE
}

function getSocketUrl(apiBase) {
  const configuredSocketUrl = normalizeUrl(import.meta.env.VITE_SOCKET_URL)
  if (configuredSocketUrl) return configuredSocketUrl

  // Fall back to the API origin when the API path ends with /api.
  return apiBase.endsWith('/api')
    ? apiBase.slice(0, -'/api'.length)
    : DEFAULT_SOCKET_URL
}

const API_BASE = getApiBase()
const SOCKET_URL = getSocketUrl(API_BASE)
const REALTIME_ENABLED = getBooleanEnv('VITE_ENABLE_REALTIME', true)

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

function extractApiError(error, fallbackMessage = 'Request failed') {
  return error?.response?.data?.message ?? error?.message ?? fallbackMessage
}

function createPollingSubscription(load, { onSuccess, onError, intervalMs = 8000 }) {
  let active = true

  const run = async () => {
    try {
      const data = await load()
      if (active) onSuccess?.(data)
    } catch (error) {
      if (active) onError?.(error)
    }
  }

  run()

  if (typeof window === 'undefined') {
    return () => {
      active = false
    }
  }

  const timer = window.setInterval(run, intervalMs)

  return () => {
    active = false
    window.clearInterval(timer)
  }
}

// ---------- Queues ----------

/** GET /api/queues — returns list of queue summaries */
export async function listQueues() {
  const { data } = await api.get('/queues')
  return data.queues ?? []
}

/** GET /api/queues/:id — returns full queue with entries[] */
export async function getQueueDetails(queueId) {
  const { data } = await api.get(`/queues/${queueId}`)
  return data.queue ?? null
}

/**
 * POST /api/queues/:queueId/leave
 * Admin force-remove: pass explicit passengerId in body.
 * Requires a valid JWT (admin token stored in sessionStorage).
 */
export async function adminRemovePassenger(queueId, passengerId) {
  const token = sessionStorage.getItem('admin_queue_token')
  const { data } = await api.post(
    `/queues/${queueId}/leave`,
    { passengerId },
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  )
  return data
}

// ---------- Admin token (thin public token for remove ops) ----------

/**
 * Acquire a thin passenger-role JWT so the admin panel can call
 * the /leave endpoint. We reuse the backend OTP flow with a shared
 * demo phone number (the backend always accepts OTP 123456).
 */
export async function ensureAdminToken() {
  if (sessionStorage.getItem('admin_queue_token')) return
  try {
    await api.post('/auth/send-otp', { phone: '+251911000101', role: 'passenger' })
    const { data } = await api.post('/auth/verify-otp', {
      phone: '+251911000101',
      otp: '123456',
      role: 'passenger',
    })
    if (data.token) {
      sessionStorage.setItem('admin_queue_token', data.token)
    }
  } catch {
    // If backend is offline the remove button will get a 401  —  acceptable.
  }
}

// ---------- Socket.IO ----------

function getSocketClient() {
  if (typeof window === 'undefined') return null

  // Support either an injected client or a global window.io fallback.
  return window.__adminSocketIo?.io ?? window.io ?? null
}

export function createSocketConnection() {
  if (!REALTIME_ENABLED) return null

  const io = getSocketClient()
  return io ? io(SOCKET_URL, { transports: ['websocket'] }) : null
}

export { API_BASE, SOCKET_URL, REALTIME_ENABLED, api, extractApiError, createPollingSubscription }

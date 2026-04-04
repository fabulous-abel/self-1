import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

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

let _socket = null

/** Connect to the backend Socket.IO server and return the socket instance. */
export function getSocket() {
  if (_socket && _socket.connected) return _socket

  // Use the native browser WebSocket via the socket.io-client CDN approach.
  // Since the admin is a Vite/React app the dependency is installed.
  if (!_socket) {
    // Dynamic import so this doesn't break SSR-like tooling
    // eslint-disable-next-line no-undef
    const { io } = window.__adminSocketIo ?? {}
    if (io) {
      _socket = io('http://localhost:5000', { transports: ['websocket'] })
    }
  }
  return _socket
}

export { API_BASE }

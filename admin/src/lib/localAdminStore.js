const STORE_EVENT = 'local-admin-store-change'

const STORAGE_KEYS = {
  admin: 'linket.admin.local.admin',
  session: 'linket.admin.local.session',
  users: 'linket.admin.local.users',
  activity: 'linket.admin.local.activity',
  broadcasts: 'linket.admin.local.broadcasts',
}

const DEFAULT_ADMIN = {
  email: 'admin@gmail.com',
  password: '123456',
  name: 'Local Admin',
}

const DEFAULT_USERS = [
  {
    id: 'driver-seed-1',
    role: 'driver',
    fullName: 'Dawit Alemu',
    phoneNumber: '0912345678',
    email: '0912345678@linket.driver.auth',
    vehicleInfo: 'Toyota Vitz - AA 67890',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'passenger-seed-1',
    role: 'passenger',
    fullName: 'Mekdes Bekele',
    phoneNumber: '0987654321',
    email: '0987654321@linket.passenger.auth',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
]

const DEFAULT_ACTIVITY = [
  {
    id: 'activity-seed-1',
    kind: 'system',
    title: 'Admin dashboard ready',
    detail: 'Live dispatch and broadcast sync are enabled for the admin dashboard.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'activity-seed-2',
    kind: 'user',
    title: 'Driver record seeded',
    detail: 'Dawit Alemu was added to the local driver list.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
]

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function emitChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(STORE_EVENT))
}

function appendActivity(entry) {
  const activity = getActivity()
  activity.unshift({
    id: `activity-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...entry,
  })
  writeJson(STORAGE_KEYS.activity, activity.slice(0, 100))
}

export function recordLocalActivity(entry) {
  ensureSeedData()
  appendActivity(entry)
  emitChange()
}

function normalizeUserInput(role, form, { requirePassword }) {
  const fullName = form.name.trim()
  const phoneNumber = form.phone.trim()
  const password = form.password.trim()

  if (!fullName || !phoneNumber) {
    throw new Error('Name and phone number are required.')
  }

  if (requirePassword && !password) {
    throw new Error('Password is required.')
  }

  if (password && password.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  if (role === 'driver' && !form.vehicle.trim()) {
    throw new Error('Vehicle info is required for drivers.')
  }

  return {
    fullName,
    phoneNumber,
    email: form.email.trim() || `${phoneNumber.replace(/\s/g, '')}@linket.${role}.auth`,
    vehicleInfo: role === 'driver' ? form.vehicle.trim() : undefined,
  }
}

function getRecentTimestamp(item) {
  return new Date(item.updatedAt ?? item.createdAt).getTime()
}

function ensureSeedData() {
  if (!canUseStorage()) return

  if (!window.localStorage.getItem(STORAGE_KEYS.admin)) {
    writeJson(STORAGE_KEYS.admin, DEFAULT_ADMIN)
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.users)) {
    writeJson(STORAGE_KEYS.users, DEFAULT_USERS)
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.activity)) {
    writeJson(STORAGE_KEYS.activity, DEFAULT_ACTIVITY)
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.broadcasts)) {
    writeJson(STORAGE_KEYS.broadcasts, [])
  }
}

export function subscribeToLocalAdminStore(callback) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => callback()
  window.addEventListener(STORE_EVENT, handler)
  window.addEventListener('storage', handler)

  return () => {
    window.removeEventListener(STORE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function getDefaultAdminCredentials() {
  ensureSeedData()
  const admin = readJson(STORAGE_KEYS.admin, DEFAULT_ADMIN)
  return { email: admin.email, password: admin.password }
}

export function getCurrentSession() {
  ensureSeedData()
  return readJson(STORAGE_KEYS.session, null)
}

export function loginAdmin(email, password) {
  ensureSeedData()
  const admin = readJson(STORAGE_KEYS.admin, DEFAULT_ADMIN)

  if (email.trim().toLowerCase() !== admin.email.toLowerCase() || password !== admin.password) {
    throw new Error('Invalid email or password for local admin mode.')
  }

  const session = {
    email: admin.email,
    name: admin.name,
    loggedInAt: new Date().toISOString(),
  }

  writeJson(STORAGE_KEYS.session, session)
  appendActivity({
    kind: 'auth',
    title: 'Admin signed in',
    detail: `${session.email} signed in to the local admin session.`,
  })
  emitChange()

  return session
}

export function logoutAdmin() {
  if (!canUseStorage()) return

  const session = getCurrentSession()
  window.localStorage.removeItem(STORAGE_KEYS.session)

  if (session) {
    appendActivity({
      kind: 'auth',
      title: 'Admin signed out',
      detail: `${session.email} signed out of the local admin session.`,
    })
  }

  emitChange()
}

export function getUsers(role) {
  ensureSeedData()
  const users = readJson(STORAGE_KEYS.users, DEFAULT_USERS)
  return users.filter(user => user.role === role)
}

export function createLocalUser(role, form) {
  ensureSeedData()
  const userInput = normalizeUserInput(role, form, { requirePassword: true })

  const users = readJson(STORAGE_KEYS.users, DEFAULT_USERS)
  const user = {
    id: `${role}-${Date.now()}`,
    role,
    fullName: userInput.fullName,
    phoneNumber: userInput.phoneNumber,
    email: userInput.email,
    ...(role === 'driver' ? { vehicleInfo: userInput.vehicleInfo } : {}),
    createdAt: new Date().toISOString(),
  }

  users.unshift(user)
  writeJson(STORAGE_KEYS.users, users)
  appendActivity({
    kind: 'user',
    title: `${role === 'driver' ? 'Driver' : 'Passenger'} record created`,
    detail: `${userInput.fullName} was added to the local ${role} list.`,
  })
  emitChange()

  return user
}

export function updateLocalUser(userId, form) {
  ensureSeedData()

  const users = readJson(STORAGE_KEYS.users, DEFAULT_USERS)
  const index = users.findIndex(user => user.id === userId)

  if (index === -1) {
    throw new Error('User record not found.')
  }

  const existingUser = users[index]
  const userInput = normalizeUserInput(existingUser.role, form, { requirePassword: false })
  const updatedUser = {
    ...existingUser,
    fullName: userInput.fullName,
    phoneNumber: userInput.phoneNumber,
    email: userInput.email,
    ...(existingUser.role === 'driver' ? { vehicleInfo: userInput.vehicleInfo } : {}),
    updatedAt: new Date().toISOString(),
  }

  users[index] = updatedUser
  writeJson(STORAGE_KEYS.users, users)
  appendActivity({
    kind: 'user',
    title: `${existingUser.role === 'driver' ? 'Driver' : 'Passenger'} record updated`,
    detail: `${updatedUser.fullName} was updated in the local ${existingUser.role} list.`,
  })
  emitChange()

  return updatedUser
}

export function getActivity() {
  ensureSeedData()
  const activity = readJson(STORAGE_KEYS.activity, DEFAULT_ACTIVITY)

  return activity
    .slice()
    .sort((a, b) => getRecentTimestamp(b) - getRecentTimestamp(a))
}

export function saveBroadcastMessage(message, target) {
  ensureSeedData()

  const trimmed = message.trim()
  if (!trimmed) {
    throw new Error('Broadcast message cannot be empty.')
  }

  const broadcasts = readJson(STORAGE_KEYS.broadcasts, [])
  const item = {
    id: `broadcast-${Date.now()}`,
    message: trimmed,
    target,
    createdAt: new Date().toISOString(),
  }

  broadcasts.unshift(item)
  writeJson(STORAGE_KEYS.broadcasts, broadcasts.slice(0, 50))
  appendActivity({
    kind: 'broadcast',
    title: 'Broadcast saved locally',
    detail: `Saved a "${target}" broadcast: ${trimmed}`,
  })
  emitChange()

  return item
}

export function updateBroadcastMessage(broadcastId, message, target) {
  ensureSeedData()

  const trimmed = message.trim()
  if (!trimmed) {
    throw new Error('Broadcast message cannot be empty.')
  }

  const broadcasts = readJson(STORAGE_KEYS.broadcasts, [])
  const index = broadcasts.findIndex(item => item.id === broadcastId)

  if (index === -1) {
    throw new Error('Broadcast record not found.')
  }

  const updatedItem = {
    ...broadcasts[index],
    message: trimmed,
    target,
    updatedAt: new Date().toISOString(),
  }

  broadcasts[index] = updatedItem
  writeJson(STORAGE_KEYS.broadcasts, broadcasts.slice(0, 50))
  appendActivity({
    kind: 'broadcast',
    title: 'Broadcast updated',
    detail: `Updated the "${target}" broadcast: ${trimmed}`,
  })
  emitChange()

  return updatedItem
}

export function getBroadcasts() {
  ensureSeedData()
  const broadcasts = readJson(STORAGE_KEYS.broadcasts, [])

  return broadcasts
    .slice()
    .sort((a, b) => getRecentTimestamp(b) - getRecentTimestamp(a))
}

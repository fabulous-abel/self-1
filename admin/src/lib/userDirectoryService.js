import { api, createPollingSubscription, extractApiError } from '../services/backendApi'

const subscribers = new Set()

const safeString = (value) => String(value || '').trim()

const normalizePhone = (value) => {
  const digits = safeString(value).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('251') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+251${digits.slice(1)}`
  if (digits.length === 9) return `+251${digits}`
  return ''
}

const getPhoneDigits = (value) => normalizePhone(value).replace('+', '')

function notifySubscribers() {
  subscribers.forEach((run) => run())
}

export function buildManagedAuthEmail(role, rawPhone) {
  const digits = getPhoneDigits(rawPhone)
  if (!digits) return ''
  return `${digits}@linket.${role}.auth`
}

export function subscribeToManagedUsers(role, callbacks) {
  const load = async () => {
    const { data } = await api.get('/admin/users', {
      params: role ? { role } : undefined,
    })
    return data.users ?? []
  }

  const run = async () => {
    try {
      const users = await load()
      callbacks.onUsers?.(users)
    } catch (error) {
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load users.')))
    }
  }

  subscribers.add(run)

  const unsubscribePolling = createPollingSubscription(load, {
    onSuccess: (users) => callbacks.onUsers?.(users),
    onError: (error) =>
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load users.'))),
  })

  return () => {
    subscribers.delete(run)
    unsubscribePolling()
  }
}

export async function createManagedUser(role, form) {
  try {
    const { data } = await api.post('/admin/users', {
      role,
      name: form.name,
      phone: form.phone,
      password: form.password,
      vehicle: form.vehicle,
    })

    notifySubscribers()
    return data.user
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to create the backend user.'))
  }
}

export async function updateManagedUser(existingUser, form) {
  try {
    const { data } = await api.put(`/admin/users/${existingUser.id}`, {
      name: form.name,
      phone: form.phone,
      vehicle: form.vehicle,
    })

    notifySubscribers()
    return data.user
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to update the backend user.'))
  }
}

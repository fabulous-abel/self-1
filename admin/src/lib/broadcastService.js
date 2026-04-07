import { api, createPollingSubscription, extractApiError } from '../services/backendApi'

const subscribers = new Set()

function notifySubscribers() {
  subscribers.forEach((run) => run())
}

export function subscribeToBroadcastMessages(callbacks) {
  const load = async () => {
    const { data } = await api.get('/admin/broadcasts')
    return data.broadcasts ?? []
  }

  const run = async () => {
    try {
      const broadcasts = await load()
      callbacks.onBroadcasts?.(broadcasts)
    } catch (error) {
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load broadcasts.')))
    }
  }

  subscribers.add(run)

  const unsubscribePolling = createPollingSubscription(load, {
    onSuccess: (broadcasts) => callbacks.onBroadcasts?.(broadcasts),
    onError: (error) =>
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load broadcasts.'))),
  })

  return () => {
    subscribers.delete(run)
    unsubscribePolling()
  }
}

export async function createBroadcastMessage({ message, target, createdBy }) {
  try {
    const { data } = await api.post('/admin/broadcasts', {
      message,
      target,
      createdBy,
    })

    notifySubscribers()
    return data.broadcast
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to save the broadcast.'))
  }
}

export async function updateBroadcastMessage(id, { message, target, updatedBy }) {
  try {
    const { data } = await api.put(`/admin/broadcasts/${id}`, {
      message,
      target,
      updatedBy,
    })

    notifySubscribers()
    return data.broadcast
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to update the broadcast.'))
  }
}

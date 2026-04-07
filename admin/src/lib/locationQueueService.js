import { api, createPollingSubscription, extractApiError } from '../services/backendApi'

const subscribers = new Set()

function notifySubscribers() {
  subscribers.forEach((run) => run())
}

export function subscribeToDispatchLocations(callbacks) {
  const load = async () => {
    const { data } = await api.get('/admin/locations')
    return data.locations ?? []
  }

  const run = async () => {
    try {
      const locations = await load()
      callbacks.onLocations?.(locations)
    } catch (error) {
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load place list.')))
    }
  }

  subscribers.add(run)

  const unsubscribePolling = createPollingSubscription(load, {
    onSuccess: (locations) => callbacks.onLocations?.(locations),
    onError: (error) =>
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load place list.'))),
  })

  return () => {
    subscribers.delete(run)
    unsubscribePolling()
  }
}

export async function createDispatchLocation(locationName) {
  try {
    const { data } = await api.post('/admin/locations', { name: locationName })
    notifySubscribers()
    return data.location
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to save place.'))
  }
}

export async function updateDispatchLocation(locationId, locationName) {
  try {
    const { data } = await api.put(`/admin/locations/${locationId}`, { name: locationName })
    notifySubscribers()
    return data.location
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to save place.'))
  }
}

export async function deleteDispatchLocation(locationId) {
  try {
    const { data } = await api.delete(`/admin/locations/${locationId}`)
    notifySubscribers()
    return data.location
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to delete place.'))
  }
}

export function subscribeToLocationDispatch(location, callbacks) {
  if (!location) {
    callbacks.onDrivers?.([])
    callbacks.onWaitingPassengers?.([])
    callbacks.onRequests?.([])
    callbacks.onTrips?.([])
    return () => {}
  }

  const load = async () => {
    const { data } = await api.get('/admin/dispatch', {
      params: { location },
    })
    return data
  }

  const run = async () => {
    try {
      const data = await load()
      callbacks.onDrivers?.(data.drivers ?? [])
      callbacks.onWaitingPassengers?.(data.waitingPassengers ?? [])
      callbacks.onRequests?.(data.requests ?? [])
      callbacks.onTrips?.(data.trips ?? [])
    } catch (error) {
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load location dispatch data.')))
    }
  }

  subscribers.add(run)

  const unsubscribePolling = createPollingSubscription(load, {
    onSuccess: (data) => {
      callbacks.onDrivers?.(data.drivers ?? [])
      callbacks.onWaitingPassengers?.(data.waitingPassengers ?? [])
      callbacks.onRequests?.(data.requests ?? [])
      callbacks.onTrips?.(data.trips ?? [])
    },
    onError: (error) =>
      callbacks.onError?.(new Error(extractApiError(error, 'Unable to load location dispatch data.'))),
  })

  return () => {
    subscribers.delete(run)
    unsubscribePolling()
  }
}

export async function createLocationQueueRequest({
  location,
  customerName,
  customerPhone,
  note,
  requestedBy,
}) {
  try {
    const { data } = await api.post('/admin/requests', {
      location,
      customerName,
      customerPhone,
      note,
      requestedBy,
    })

    notifySubscribers()
    return data
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to add the customer to the queue.'))
  }
}

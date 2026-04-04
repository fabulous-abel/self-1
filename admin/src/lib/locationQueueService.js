import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebaseClient'

export const DEFAULT_DISPATCH_LOCATIONS = ['Terminal A', 'Corporate Exit', 'Main Gate']

const DEFAULT_CAPACITY = 4

const dispatchLocationsRef = collection(db, 'dispatch_locations')

const sortByNewest = (items) => (
  items
    .slice()
    .sort((left, right) => getTimestampMs(right.updatedAt ?? right.createdAt ?? right.timestamp) - getTimestampMs(left.updatedAt ?? left.createdAt ?? left.timestamp))
)

const sortLocationsByName = (items) => (
  items
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
)

const safeString = (value) => String(value || '').trim()

function normalizeLocationKey(value) {
  return safeString(value).toLowerCase()
}

function getTimestampMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') {
    return value.toMillis()
  }

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizePassengerDocId(phoneNumber) {
  return safeString(phoneNumber).replace(/\//g, '-')
}

function serializeLocation(docSnapshot) {
  const data = docSnapshot.data() || {}
  return {
    id: docSnapshot.id,
    name: safeString(data.name) || docSnapshot.id,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

function serializeDriver(docSnapshot) {
  const data = docSnapshot.data() || {}
  return {
    id: docSnapshot.id,
    driverPhone: docSnapshot.id,
    driverName: safeString(data.driverName) || 'Driver',
    vehicleInfo: safeString(data.vehicleInfo) || 'Vehicle not set',
    status: safeString(data.status) || 'waiting',
    timestamp: data.timestamp || null,
  }
}

function serializePassenger(docSnapshot) {
  const data = docSnapshot.data() || {}
  return {
    id: docSnapshot.id,
    customerName: safeString(data.passengerName) || 'Caller',
    customerPhone: safeString(data.passengerPhone) || docSnapshot.id,
    note: safeString(data.note),
    requestedBy: safeString(data.requestedBy),
    createdAt: data.createdAt || data.timestamp || null,
    source: safeString(data.source) || 'queue',
  }
}

function serializeRequest(docSnapshot) {
  const data = docSnapshot.data() || {}
  return {
    id: docSnapshot.id,
    location: safeString(data.location),
    customerName: safeString(data.customerName) || 'Caller',
    customerPhone: safeString(data.customerPhone),
    note: safeString(data.note),
    status: safeString(data.status) || 'queued',
    requestedBy: safeString(data.requestedBy),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    matchedAt: data.matchedAt || null,
    matchedDriverName: safeString(data.matchedDriverName),
    matchedDriverPhone: safeString(data.matchedDriverPhone),
  }
}

function serializeTrip(docSnapshot) {
  const data = docSnapshot.data() || {}

  return {
    id: docSnapshot.id,
    driverPhone: safeString(data.driverPhone) || docSnapshot.id,
    driverName: safeString(data.driverName) || 'Driver',
    vehicleInfo: safeString(data.vehicleInfo),
    zone: safeString(data.zone),
    status: safeString(data.status) || 'waiting',
    capacity: Number(data.capacity || DEFAULT_CAPACITY),
    passengers: Array.isArray(data.passengers) ? data.passengers.filter(Boolean) : [],
    latestQueueRequest: data.latestQueueRequest || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

async function listDispatchLocations() {
  const snapshot = await getDocs(dispatchLocationsRef)
  return sortLocationsByName(snapshot.docs.map(serializeLocation))
}

async function ensureDispatchLocationDocument(locationName) {
  await setDoc(
    doc(db, 'pickup_regions', locationName),
    {
      name: locationName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

async function ensureDispatchLocationsSeeded() {
  const existing = await listDispatchLocations()
  if (existing.length > 0) {
    return existing
  }

  for (const name of DEFAULT_DISPATCH_LOCATIONS) {
    await addDoc(dispatchLocationsRef, {
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await ensureDispatchLocationDocument(name)
  }

  return DEFAULT_DISPATCH_LOCATIONS.map((name) => ({
    id: name,
    name,
  }))
}

async function validateLocationName(locationName, excludeId = '') {
  const cleanName = safeString(locationName)
  if (!cleanName) {
    throw new Error('Place name is required.')
  }

  const existing = await listDispatchLocations()
  const duplicate = existing.find((item) => item.id !== excludeId && normalizeLocationKey(item.name) === normalizeLocationKey(cleanName))

  if (duplicate) {
    throw new Error('A place with that name already exists.')
  }

  return cleanName
}

async function migrateSubcollection(oldName, newName, subcollection) {
  const snapshot = await getDocs(collection(db, 'pickup_regions', oldName, subcollection))

  for (const item of snapshot.docs) {
    await setDoc(doc(db, 'pickup_regions', newName, subcollection, item.id), item.data(), { merge: true })
  }

  for (const item of snapshot.docs) {
    await deleteDoc(item.ref)
  }
}

async function migrateLocationReferences(oldName, newName) {
  if (oldName === newName) return

  await ensureDispatchLocationDocument(newName)
  await migrateSubcollection(oldName, newName, 'driver_queue')
  await migrateSubcollection(oldName, newName, 'passenger_queue')

  const tripSnapshot = await getDocs(query(collection(db, 'active_trips'), where('zone', '==', oldName)))
  for (const item of tripSnapshot.docs) {
    await updateDoc(item.ref, {
      zone: newName,
      updatedAt: serverTimestamp(),
    })
  }

  const requestSnapshot = await getDocs(query(collection(db, 'phone_queue_requests'), where('location', '==', oldName)))
  for (const item of requestSnapshot.docs) {
    await updateDoc(item.ref, {
      location: newName,
      updatedAt: serverTimestamp(),
    })
  }

  await deleteDoc(doc(db, 'pickup_regions', oldName))
}

async function ensureLocationIsUnused(locationName) {
  const driverSnapshot = await getDocs(collection(db, 'pickup_regions', locationName, 'driver_queue'))
  if (!driverSnapshot.empty) {
    throw new Error('Cannot delete a place while drivers are still queued there.')
  }

  const passengerSnapshot = await getDocs(collection(db, 'pickup_regions', locationName, 'passenger_queue'))
  if (!passengerSnapshot.empty) {
    throw new Error('Cannot delete a place while callers are still waiting there.')
  }

  const tripSnapshot = await getDocs(query(collection(db, 'active_trips'), where('zone', '==', locationName)))
  if (!tripSnapshot.empty) {
    throw new Error('Cannot delete a place while it still has active driver trips.')
  }

  const requestSnapshot = await getDocs(query(collection(db, 'phone_queue_requests'), where('location', '==', locationName)))
  const hasQueuedRequest = requestSnapshot.docs.some((item) => safeString(item.data()?.status) === 'queued')
  if (hasQueuedRequest) {
    throw new Error('Cannot delete a place while phone requests are still queued for it.')
  }
}

async function ensureDriverTrip(driver, location) {
  const tripRef = doc(db, 'active_trips', driver.driverPhone)
  const tripSnapshot = await getDoc(tripRef)

  if (!tripSnapshot.exists()) {
    await setDoc(tripRef, {
      driverPhone: driver.driverPhone,
      driverName: driver.driverName,
      vehicleInfo: driver.vehicleInfo,
      zone: location,
      status: 'waiting',
      passengers: [],
      capacity: DEFAULT_CAPACITY,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return {
      ref: tripRef,
      data: {
        driverPhone: driver.driverPhone,
        driverName: driver.driverName,
        vehicleInfo: driver.vehicleInfo,
        zone: location,
        status: 'waiting',
        passengers: [],
        capacity: DEFAULT_CAPACITY,
      },
    }
  }

  return {
    ref: tripRef,
    data: tripSnapshot.data() || {},
  }
}

export function subscribeToDispatchLocations(callbacks) {
  ensureDispatchLocationsSeeded().catch((error) => callbacks.onError?.(error))

  return onSnapshot(
    dispatchLocationsRef,
    (snapshot) => {
      callbacks.onLocations?.(sortLocationsByName(snapshot.docs.map(serializeLocation)))
    },
    (error) => callbacks.onError?.(error)
  )
}

export async function createDispatchLocation(locationName) {
  const cleanName = await validateLocationName(locationName)
  const created = await addDoc(dispatchLocationsRef, {
    name: cleanName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await ensureDispatchLocationDocument(cleanName)

  return {
    id: created.id,
    name: cleanName,
  }
}

export async function updateDispatchLocation(locationId, locationName) {
  const locationRef = doc(db, 'dispatch_locations', locationId)
  const snapshot = await getDoc(locationRef)

  if (!snapshot.exists()) {
    throw new Error('Place not found.')
  }

  const existing = serializeLocation(snapshot)
  const cleanName = await validateLocationName(locationName, locationId)

  if (existing.name !== cleanName) {
    await migrateLocationReferences(existing.name, cleanName)
  }

  await updateDoc(locationRef, {
    name: cleanName,
    updatedAt: serverTimestamp(),
  })

  return {
    id: existing.id,
    name: cleanName,
  }
}

export async function deleteDispatchLocation(locationId) {
  const locationRef = doc(db, 'dispatch_locations', locationId)
  const snapshot = await getDoc(locationRef)

  if (!snapshot.exists()) {
    throw new Error('Place not found.')
  }

  const existingLocations = await listDispatchLocations()
  if (existingLocations.length <= 1) {
    throw new Error('Keep at least one place in the dispatch system.')
  }

  const existing = serializeLocation(snapshot)
  await ensureLocationIsUnused(existing.name)
  await deleteDoc(locationRef)
  await deleteDoc(doc(db, 'pickup_regions', existing.name))

  return existing
}

export function subscribeToLocationDispatch(location, callbacks) {
  if (!location) {
    callbacks.onDrivers?.([])
    callbacks.onWaitingPassengers?.([])
    callbacks.onRequests?.([])
    callbacks.onTrips?.([])
    return () => {}
  }

  const unsubscribers = []

  unsubscribers.push(
    onSnapshot(
      collection(db, 'pickup_regions', location, 'driver_queue'),
      (snapshot) => {
        callbacks.onDrivers?.(sortByNewest(snapshot.docs.map(serializeDriver)))
      },
      (error) => callbacks.onError?.(error)
    )
  )

  unsubscribers.push(
    onSnapshot(
      collection(db, 'pickup_regions', location, 'passenger_queue'),
      (snapshot) => {
        callbacks.onWaitingPassengers?.(sortByNewest(snapshot.docs.map(serializePassenger)))
      },
      (error) => callbacks.onError?.(error)
    )
  )

  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'phone_queue_requests'), where('location', '==', location)),
      (snapshot) => {
        callbacks.onRequests?.(sortByNewest(snapshot.docs.map(serializeRequest)))
      },
      (error) => callbacks.onError?.(error)
    )
  )

  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'active_trips'), where('zone', '==', location)),
      (snapshot) => {
        callbacks.onTrips?.(sortByNewest(snapshot.docs.map(serializeTrip)))
      },
      (error) => callbacks.onError?.(error)
    )
  )

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}

export async function createLocationQueueRequest({
  location,
  customerName,
  customerPhone,
  note,
  requestedBy,
}) {
  const cleanLocation = safeString(location)
  const cleanName = safeString(customerName)
  const cleanPhone = safeString(customerPhone)
  const cleanNote = safeString(note)

  if (!cleanLocation || !cleanName || !cleanPhone) {
    throw new Error('Location, customer name, and customer phone are required.')
  }

  await ensureDispatchLocationDocument(cleanLocation)

  const passengerQueueRef = doc(
    db,
    'pickup_regions',
    cleanLocation,
    'passenger_queue',
    normalizePassengerDocId(cleanPhone)
  )

  await setDoc(passengerQueueRef, {
    passengerName: cleanName,
    passengerPhone: cleanPhone,
    note: cleanNote,
    source: 'admin_call',
    requestedBy: safeString(requestedBy) || 'admin',
    createdAt: serverTimestamp(),
    timestamp: serverTimestamp(),
  })

  const requestRef = await addDoc(collection(db, 'phone_queue_requests'), {
    location: cleanLocation,
    customerName: cleanName,
    customerPhone: cleanPhone,
    note: cleanNote,
    source: 'admin_call',
    requestedBy: safeString(requestedBy) || 'admin',
    status: 'queued',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const driverSnapshot = await getDocs(collection(db, 'pickup_regions', cleanLocation, 'driver_queue'))
  const drivers = driverSnapshot.docs
    .map(serializeDriver)
    .sort((left, right) => getTimestampMs(left.timestamp) - getTimestampMs(right.timestamp))

  for (const driver of drivers) {
    const activeTrip = await ensureDriverTrip(driver, cleanLocation)
    const tripData = activeTrip.data || {}
    const passengers = Array.isArray(tripData.passengers) ? tripData.passengers.filter(Boolean) : []
    const capacity = Number(tripData.capacity || DEFAULT_CAPACITY)
    const status = safeString(tripData.status) || 'waiting'

    if (status !== 'waiting' || passengers.length >= capacity) {
      continue
    }

    const nextPassengers = passengers.includes(cleanPhone)
      ? passengers
      : [...passengers, cleanPhone]

    await setDoc(
      activeTrip.ref,
      {
        driverPhone: driver.driverPhone,
        driverName: driver.driverName,
        vehicleInfo: driver.vehicleInfo,
        zone: cleanLocation,
        status: 'waiting',
        passengers: nextPassengers,
        capacity,
        latestQueueRequest: {
          customerName: cleanName,
          customerPhone: cleanPhone,
          note: cleanNote,
          source: 'admin_call',
          requestedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    await deleteDoc(passengerQueueRef)
    await updateDoc(requestRef, {
      status: 'matched',
      matchedDriverName: driver.driverName,
      matchedDriverPhone: driver.driverPhone,
      matchedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return {
      requestId: requestRef.id,
      matched: true,
      driverName: driver.driverName,
      driverPhone: driver.driverPhone,
      location: cleanLocation,
    }
  }

  await updateDoc(requestRef, {
    status: 'queued',
    updatedAt: serverTimestamp(),
  })

  return {
    requestId: requestRef.id,
    matched: false,
    location: cleanLocation,
  }
}

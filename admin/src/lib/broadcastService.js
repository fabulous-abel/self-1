import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebaseClient'

const broadcastsRef = collection(db, 'broadcast_messages')

const safeString = (value) => String(value || '').trim()
const serializeTimestamp = (value) => {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  return value
}

function serializeBroadcast(docSnapshot) {
  const data = docSnapshot.data() || {}
  return {
    id: docSnapshot.id,
    target: safeString(data.target) || 'both',
    message: safeString(data.message),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    createdBy: safeString(data.createdBy),
  }
}

export function subscribeToBroadcastMessages(callbacks) {
  return onSnapshot(
    query(broadcastsRef, orderBy('createdAt', 'desc')),
    (snapshot) => {
      callbacks.onBroadcasts?.(snapshot.docs.map(serializeBroadcast))
    },
    (error) => callbacks.onError?.(error)
  )
}

export async function createBroadcastMessage({ message, target, createdBy }) {
  const trimmed = safeString(message)
  if (!trimmed) {
    throw new Error('Broadcast message cannot be empty.')
  }

  const created = await addDoc(broadcastsRef, {
    message: trimmed,
    target: safeString(target) || 'both',
    createdBy: safeString(createdBy) || 'admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: created.id,
    message: trimmed,
    target: safeString(target) || 'both',
  }
}

export async function updateBroadcastMessage(id, { message, target, updatedBy }) {
  const trimmed = safeString(message)
  if (!trimmed) {
    throw new Error('Broadcast message cannot be empty.')
  }

  const broadcastRef = doc(db, 'broadcast_messages', id)
  const snapshot = await getDoc(broadcastRef)

  if (!snapshot.exists()) {
    throw new Error('Broadcast record not found.')
  }

  await updateDoc(broadcastRef, {
    message: trimmed,
    target: safeString(target) || 'both',
    updatedBy: safeString(updatedBy) || 'admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id,
    message: trimmed,
    target: safeString(target) || 'both',
  }
}

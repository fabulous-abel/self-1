import { deleteApp, initializeApp } from 'firebase/app'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { db, firebaseConfig } from './firebaseClient'

const usersRef = collection(db, 'app_users')

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

export function buildManagedAuthEmail(role, rawPhone) {
  const digits = getPhoneDigits(rawPhone)
  if (!digits) return ''
  return `${digits}@linket.${role}.auth`
}

function getUserDocId(role, rawPhone) {
  const digits = getPhoneDigits(rawPhone)
  if (!digits) {
    throw new Error('Use a valid Ethiopian phone number.')
  }

  return `${role}-${digits}`
}

function validateInput(role, form, { requirePassword, existingUser = null } = {}) {
  const fullName = safeString(form.name)
  const phoneNumber = normalizePhone(form.phone)
  const password = safeString(form.password)

  if (!fullName || !phoneNumber) {
    throw new Error('Name and a valid Ethiopian phone number are required.')
  }

  if (requirePassword && !password) {
    throw new Error('Password is required.')
  }

  if (password && password.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  if (role === 'driver' && !safeString(form.vehicle)) {
    throw new Error('Vehicle info is required for drivers.')
  }

  const email = buildManagedAuthEmail(role, phoneNumber)

  if (existingUser) {
    if (existingUser.phoneNumber !== phoneNumber) {
      throw new Error('Phone number changes are not supported from admin yet.')
    }

    if (safeString(existingUser.email) !== email) {
      throw new Error('Email changes are not supported from admin yet.')
    }

    if (password) {
      throw new Error('Password changes need a Firebase admin backend and are not supported here yet.')
    }
  }

  return {
    fullName,
    phoneNumber,
    email,
    vehicleInfo: role === 'driver' ? safeString(form.vehicle) : '',
    password,
  }
}

function serializeUser(snapshot) {
  const data = snapshot.data() || {}
  const createdAt = typeof data.createdAt?.toDate === 'function'
    ? data.createdAt.toDate().toISOString()
    : data.createdAt || null
  const updatedAt = typeof data.updatedAt?.toDate === 'function'
    ? data.updatedAt.toDate().toISOString()
    : data.updatedAt || null

  return {
    id: snapshot.id,
    uid: safeString(data.uid),
    role: safeString(data.role),
    fullName: safeString(data.fullName),
    phoneNumber: safeString(data.phoneNumber),
    email: safeString(data.email),
    vehicleInfo: safeString(data.vehicleInfo),
    source: safeString(data.source) || 'admin',
    createdAt,
    updatedAt,
  }
}

export function subscribeToManagedUsers(role, callbacks) {
  return onSnapshot(
    query(usersRef, orderBy('createdAt', 'desc')),
    (snapshot) => {
      const users = snapshot.docs
        .map(serializeUser)
        .filter((user) => user.role === role)
      callbacks.onUsers?.(users)
    },
    (error) => callbacks.onError?.(error),
  )
}

export async function createManagedUser(role, form) {
  const userInput = validateInput(role, form, { requirePassword: true })
  const appName = `user-directory-${Date.now()}`
  const secondaryApp = initializeApp(firebaseConfig, appName)
  const secondaryAuth = getAuth(secondaryApp)
  let createdUser = null

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      userInput.email,
      userInput.password,
    )

    createdUser = credential.user
    await updateProfile(createdUser, {
      displayName: userInput.fullName,
    })

    const userDocId = getUserDocId(role, userInput.phoneNumber)
    await setDoc(doc(db, 'app_users', userDocId), {
      uid: createdUser.uid,
      role,
      fullName: userInput.fullName,
      phoneNumber: userInput.phoneNumber,
      email: userInput.email,
      vehicleInfo: role === 'driver' ? userInput.vehicleInfo : '',
      source: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return {
      id: userDocId,
      uid: createdUser.uid,
      role,
      fullName: userInput.fullName,
      phoneNumber: userInput.phoneNumber,
      email: userInput.email,
      vehicleInfo: role === 'driver' ? userInput.vehicleInfo : '',
      source: 'admin',
    }
  } catch (error) {
    if (createdUser) {
      try {
        await deleteUser(createdUser)
      } catch {
        // Best-effort rollback when Firestore sync fails after auth creation.
      }
    }

    if (error?.code === 'auth/email-already-in-use') {
      throw new Error('A Firebase account already exists for this phone number.')
    }

    throw new Error(error?.message || 'Unable to create the Firebase user.')
  } finally {
    try {
      await signOut(secondaryAuth)
    } catch {
      // Ignore cleanup errors.
    }
    await deleteApp(secondaryApp)
  }
}

export async function updateManagedUser(existingUser, form) {
  const userInput = validateInput(existingUser.role, form, {
    requirePassword: false,
    existingUser,
  })

  await updateDoc(doc(db, 'app_users', existingUser.id), {
    fullName: userInput.fullName,
    vehicleInfo: existingUser.role === 'driver' ? userInput.vehicleInfo : '',
    updatedAt: serverTimestamp(),
  })

  return {
    ...existingUser,
    fullName: userInput.fullName,
    vehicleInfo: existingUser.role === 'driver' ? userInput.vehicleInfo : '',
  }
}

import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: 'AIzaSyBdBb_fkoJXLOgbgPWlmTtnpOCy7_C1QUc',
  appId: '1:93702977270:web:e4a948a20e5f6702baded7',
  messagingSenderId: '93702977270',
  projectId: 'linket-f1dc3',
  authDomain: 'linket-f1dc3.firebaseapp.com',
  storageBucket: 'linket-f1dc3.firebasestorage.app',
  measurementId: 'G-C512NFJQQF',
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)

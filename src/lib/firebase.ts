import { FirebaseApp, initializeApp } from 'firebase/app';
import { getAuth as _getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore as _getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage as _getStorage } from 'firebase/storage';

let firebaseApp: FirebaseApp;
const shouldUseEmulator = () => import.meta.env.VITE_USE_FIREBASE_EMULATOR;

export const setupFirebase = () => {
  try {
    firebaseApp = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTHDOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASEURL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECTID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGEBUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGINGSENDERID,
      appId: import.meta.env.VITE_FIREBASE_APPID,
    });
  } catch (error) {
    console.error({ error });
  }
};

let auth: Auth;
let firestore: ReturnType<typeof _getFirestore>;
let storage: ReturnType<typeof _getStorage>;

export const getAuth = () => {
  if (auth == null) {
    auth = _getAuth(firebaseApp);
    if (shouldUseEmulator()) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
  }
  return auth;
};

export const getFirestore = () => {
  if (firestore == null) {
    firestore = _getFirestore();
    if (shouldUseEmulator()) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
  }
  return firestore;
};

export const getStorage = () => {
  if (storage == null) {
    storage = _getStorage();
    if (shouldUseEmulator()) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  }
  return storage;
};

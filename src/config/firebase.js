import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app = null;
let auth = null;

// Check if Firebase is configured
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey &&
         firebaseConfig.authDomain &&
         firebaseConfig.projectId;
};

// Initialize Firebase only if configured
if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Providers
const googleProvider = auth ? new GoogleAuthProvider() : null;
const facebookProvider = auth ? new FacebookAuthProvider() : null;
const appleProvider = auth ? new OAuthProvider('apple.com') : null;

// Configure providers
if (googleProvider) {
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
}

if (facebookProvider) {
  facebookProvider.addScope('email');
  facebookProvider.addScope('public_profile');
}

if (appleProvider) {
  appleProvider.addScope('email');
  appleProvider.addScope('name');
}

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase is not configured');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result;
};

/**
 * Sign in with Facebook
 */
export const signInWithFacebook = async () => {
  if (!auth || !facebookProvider) {
    throw new Error('Firebase is not configured');
  }
  const result = await signInWithPopup(auth, facebookProvider);
  return result;
};

/**
 * Sign in with Apple
 */
export const signInWithApple = async () => {
  if (!auth || !appleProvider) {
    throw new Error('Firebase is not configured');
  }
  const result = await signInWithPopup(auth, appleProvider);
  return result;
};

/**
 * Sign out from Firebase
 */
export const signOut = async () => {
  if (!auth) {
    throw new Error('Firebase is not configured');
  }
  await firebaseSignOut(auth);
};

/**
 * Check if Firebase is available
 */
export const isFirebaseAvailable = () => {
  return auth !== null;
};

export { auth };

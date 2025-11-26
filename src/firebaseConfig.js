import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDHgmV-q-pM_ISr4k5Hw4ia2xL876sEXTA",
  authDomain: "pantry-c9a16.firebaseapp.com",
  projectId: "pantry-c9a16",
  storageBucket: "pantry-c9a16.firebasestorage.app",
  messagingSenderId: "438099088507",
  appId: "1:438099088507:web:faffd1a738844d26323ede",
  measurementId: "G-V27P7T9VWS",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "pantry1");
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export default app;

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDFnNEBCo-B1k0RiB4Dg0Y1Ei_ZMiXb6-Q",
  authDomain: "stacy-bomar-tracker.firebaseapp.com",
  projectId: "stacy-bomar-tracker",
  storageBucket: "stacy-bomar-tracker.firebasestorage.app",
  messagingSenderId: "937797571947",
  appId: "1:937797571947:web:db3cc79651e62bbb46282e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-east1");

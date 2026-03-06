import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

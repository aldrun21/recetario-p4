import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCbVnbaacMaASIvtUdBKNW5DfwYip9Ktlg",
  authDomain: "ultimate-container-wln7n.firebaseapp.com",
  projectId: "ultimate-container-wln7n",
  storageBucket: "ultimate-container-wln7n.firebasestorage.app",
  messagingSenderId: "100801153021",
  appId: "1:100801153021:web:829538f9adf2f95220bb94"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-9a7e3bac-6f1a-437d-9118-313dca1324e2");


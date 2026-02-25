import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBLeFqYFG2rdS7-JZxqJJzRG11nXKqu_Og",
  authDomain: "fragsmnl.firebaseapp.com",
  databaseURL: "https://fragsmnl-default-rtdb.firebaseio.com",
  projectId: "fragsmnl",
  storageBucket: "fragsmnl.firebasestorage.app",
  messagingSenderId: "831378527541",
  appId: "1:831378527541:web:5dbc6519234637669ba87c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
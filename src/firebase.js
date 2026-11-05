import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, doc, setDoc, deleteDoc,
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth';
import { toFirebaseEmail, toFirebasePassword } from './loginAccount';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);

const COLLECTION = 'transactions';

export const subscribeAuth = (callback) => onAuthStateChanged(auth, callback);
export const login = (username, password) =>
  signInWithEmailAndPassword(auth, toFirebaseEmail(username), toFirebasePassword(password));
export const logout = () => signOut(auth);

// Minta ulang password pengguna yang sedang login sebelum edit/hapus
export async function confirmPassword(password) {
  const user = auth.currentUser;
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, toFirebasePassword(password)));
}

export async function fetchAllTransactions() {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

// Dipakai untuk tambah & edit (id dokumen = id transaksi)
export async function saveTransaction(data) {
  const { id, ...rest } = data;
  await setDoc(doc(db, COLLECTION, String(id)), rest, { merge: true });
}

export async function removeTransaction(id) {
  await deleteDoc(doc(db, COLLECTION, String(id)));
}

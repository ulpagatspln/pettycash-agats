import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, getDoc, doc, writeBatch,
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
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
const RECEIPTS = 'receipts';

export const subscribeAuth = (callback) => onAuthStateChanged(auth, callback);
export const login = (username, password) =>
  signInWithEmailAndPassword(auth, toFirebaseEmail(username), toFirebasePassword(password));
export const logout = () => signOut(auth);

export async function fetchAllTransactions() {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

// Dipakai untuk tambah & edit (id dokumen = id transaksi).
// Foto disimpan di koleksi terpisah supaya daftar transaksi tetap ringan dimuat.
export async function saveTransaction(data, receiptDataUrl) {
  const { id, ...rest } = data;
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTION, String(id)), rest, { merge: true });
  if (receiptDataUrl) batch.set(doc(db, RECEIPTS, String(id)), { dataUrl: receiptDataUrl });
  await batch.commit();
}

export async function removeTransaction(id) {
  const batch = writeBatch(db);
  batch.delete(doc(db, COLLECTION, String(id)));
  batch.delete(doc(db, RECEIPTS, String(id)));
  await batch.commit();
}

export async function fetchReceipt(id) {
  const snap = await getDoc(doc(db, RECEIPTS, String(id)));
  return snap.exists() ? snap.data().dataUrl : null;
}

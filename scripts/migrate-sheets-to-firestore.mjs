// Migrasi sekali jalan: Google Sheets (Apps Script) -> Firestore
// Pakai:  node scripts/migrate-sheets-to-firestore.mjs
// Butuh .env berisi VITE_FIREBASE_*, aturan firestore.rules sudah aktif,
// dan akun Firebase Auth. Username & password ditanyakan saat dijalankan dan tidak disimpan.
import 'dotenv/config';
import { createInterface } from 'node:readline';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { toFirebaseEmail, toFirebasePassword } from '../src/loginAccount.js';

const SCRIPT_URL = process.env.SHEETS_SCRIPT_URL
  || 'https://script.google.com/macros/s/AKfycbxnH52D3refqCMgu0gWnGeHej1QnR5bOnGEKYpu7ChRZTwy7qPKNPqRT4C-TaXL8XSr/exec';

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
    // Sembunyikan ketikan password dari layar
    if (hidden) rl._writeToOutput = () => {};
  });
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const username = await ask('Username: ');
const password = await ask('Password (ketikan tidak terlihat): ', { hidden: true });
await signInWithEmailAndPassword(getAuth(app), toFirebaseEmail(username), toFirebasePassword(password));
console.log('Login berhasil.');

const res = await fetch(SCRIPT_URL);
if (!res.ok) throw new Error(`Gagal mengambil data Sheets: HTTP ${res.status}`);
const rows = await res.json();
console.log(`Ditemukan ${rows.length} transaksi di Google Sheets.`);

for (let i = 0; i < rows.length; i += 400) {
  const batch = writeBatch(db);
  rows.slice(i, i + 400).forEach((t) => {
    const { id, ...rest } = t;
    batch.set(doc(db, 'transactions', String(id)), { ...rest, amount: parseFloat(t.amount) }, { merge: true });
  });
  await batch.commit();
  console.log(`Tersimpan ${Math.min(i + 400, rows.length)}/${rows.length}`);
}
console.log('Migrasi selesai.');
process.exit(0);

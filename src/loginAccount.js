// Pengguna mengetik username & password pendek (admin / admin).
// Firebase Auth butuh format email dan password minimal 6 karakter, jadi keduanya dipetakan di sini.
// Akun hasil pemetaan dibuat di Firebase Console > Authentication > Users.
const EMAIL_DOMAIN = 'pettycash-ulp.local';
const PASSWORD_SUFFIX = '-pettycash-ulp';

export const toFirebaseEmail = (username) => `${username.trim()}@${EMAIL_DOMAIN}`;
export const toFirebasePassword = (password) => `${password}${PASSWORD_SUFFIX}`;

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyA78UUP0pxQmfVa0UBz_0WhAIn5KvT1RCU",
  authDomain: "dekyah-uas-library.firebaseapp.com",
  projectId: "dekyah-uas-library",
  storageBucket: "dekyah-uas-library.firebasestorage.app",
  messagingSenderId: "52950960526",
  appId: "1:52950960526:web:3f8d543b010c6a29ba7cdf",
  measurementId: "G-T85R134YS2"
};



// Daftar key yang wajib diisi
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'] as const;

// Filter key yang belum diisi (nilainya undefined atau kosong)
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

// Tampilkan warning jika ada yang belum diisi
if (missingKeys.length > 0) {
  console.warn(
    `⚠️ Konfigurasi Firebase belum lengkap: ${missingKeys.join(', ')}\n` +
    'Silakan copy .env.example ke .env dan isi dengan nilai Firebase kamu.'
  );
}

// ============================================
// INISIALISASI FIREBASE
// ============================================

/**
 * Inisialisasi Firebase App
 * Ini adalah langkah pertama sebelum menggunakan layanan Firebase lainnya
 */
const app: FirebaseApp = initializeApp(firebaseConfig);

/**
 * Instance Firebase Authentication
 * Digunakan untuk:
 * - Login dengan email/password
 * - Register user baru
 * - Logout
 * - Cek status login
 */
export const auth: Auth = getAuth(app);

/**
 * Instance Firestore Database
 * Digunakan untuk:
 * - Menyimpan data (users, books, transactions)
 * - Mengambil data
 * - Update dan delete data
 * - Query data dengan filter
 */
export const db: Firestore = getFirestore(app);

/**
 * Instance Firebase Storage
 * Digunakan untuk:
 * - Upload gambar sampul buku
 * - Mendapatkan URL gambar
 * - Menghapus gambar
 */
export const storage: FirebaseStorage = getStorage(app);

/**
 * Export Firebase app instance
 * Biasanya tidak perlu digunakan langsung
 */
export default app;

// ============================================
// KONSTANTA NAMA COLLECTION
// Menggunakan konstanta untuk menghindari typo
// ============================================

/**
 * Nama-nama collection di Firestore
 * 
 * Collection seperti "tabel" di database SQL
 * - users: menyimpan data pengguna
 * - books: menyimpan data buku
 * - transactions: menyimpan data peminjaman
 */
export const COLLECTIONS = {
  USERS: 'users',
  BOOKS: 'books',
  TRANSACTIONS: 'transactions',
} as const;
// "as const" membuat nilai tidak bisa diubah (immutable)

/**
 * Path penyimpanan di Firebase Storage
 * 
 * Struktur folder di Storage:
 * - book-covers/: folder untuk menyimpan gambar sampul buku
 */
export const STORAGE_PATHS = {
  BOOK_COVERS: 'book-covers',
} as const;

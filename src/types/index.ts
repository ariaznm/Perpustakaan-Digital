export interface User {
  uid: string;           // ID unik dari Firebase Auth (otomatis dibuat saat register)
  email: string;         // Alamat email pengguna
  role: 'admin' | 'member';  // Peran pengguna: admin atau member (anggota perpustakaan)
  name: string;          // Nama lengkap pengguna
}

/**
 * Interface Book - Merepresentasikan data buku
 * 
 * Setiap buku di perpustakaan memiliki data ini
 * Data ini disimpan di Firestore collection 'books'
 */
export interface Book {
  id: string;            // ID unik buku (otomatis dibuat oleh Firestore)
  title: string;         // Judul buku
  author: string;        // Nama penulis/pengarang
  coverUrl: string;      // URL gambar sampul buku (disimpan di Firebase Storage)
  status: 'AVAILABLE' | 'BORROWED';  // Status ketersediaan buku
  description?: string;  // Deskripsi buku (opsional, tanda ? artinya boleh kosong)
  isbn?: string;         // Nomor ISBN buku (opsional)
  createdAt?: Date;      // Tanggal buku ditambahkan (opsional)
  updatedAt?: Date;      // Tanggal terakhir buku diupdate (opsional)
}

/**
 * Interface Transaction - Merepresentasikan data transaksi peminjaman
 * 
 * Setiap kali anggota meminjam buku, akan dibuat record transaksi
 * Data ini disimpan di Firestore collection 'transactions'
 */
export interface Transaction {
  id: string;            // ID unik transaksi
  bookId: string;        // ID buku yang dipinjam (referensi ke collection books)
  userId: string;        // ID pengguna yang meminjam (referensi ke collection users)
  borrowDate: Date;      // Tanggal peminjaman
  returnDate: Date | null;  // Tanggal pengembalian (null jika belum dikembalikan)
  status: 'BORROWED' | 'RETURNED';  // Status: BORROWED = dipinjam, RETURNED = sudah dikembalikan
  bookTitle?: string;    // Judul buku (disimpan untuk kemudahan tampilan)
  userName?: string;     // Nama peminjam (disimpan untuk kemudahan tampilan)
}

// ============================================
// TIPE DOKUMEN FIRESTORE
// Tipe ini digunakan saat menyimpan/mengambil data dari Firestore
// Bedanya dengan model utama: tidak ada field 'id' karena id disimpan terpisah oleh Firestore
// ============================================

/**
 * UserDoc - Struktur dokumen user di Firestore
 * Tidak ada 'uid' karena uid adalah ID dokumen itu sendiri
 */
export interface UserDoc {
  email: string;
  role: 'admin' | 'member';
  name: string;
  createdAt?: Date;
}

/**
 * BookDoc - Struktur dokumen buku di Firestore
 * Tidak ada 'id' karena id adalah ID dokumen itu sendiri
 */
export interface BookDoc {
  title: string;
  author: string;
  coverUrl: string;
  status: 'AVAILABLE' | 'BORROWED';
  description?: string;
  isbn?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * TransactionDoc - Struktur dokumen transaksi di Firestore
 */
export interface TransactionDoc {
  bookId: string;
  userId: string;
  borrowDate: Date;
  returnDate: Date | null;
  status: 'BORROWED' | 'RETURNED';
  bookTitle?: string;
  userName?: string;
}

// ============================================
// TIPE NAVIGASI
// Tipe ini digunakan untuk navigasi antar layar dengan React Navigation
// Dengan tipe ini, TypeScript bisa memvalidasi parameter yang dikirim antar layar
// ============================================

// Import tipe dari library navigasi
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

/**
 * RootStackParamList - Daftar layar di Stack Navigator utama
 * 
 * Stack Navigator seperti tumpukan kartu:
 * - Layar baru ditumpuk di atas layar sebelumnya
 * - Tombol back akan kembali ke layar sebelumnya
 */
export type RootStackParamList = {
  Login: undefined;  // Layar Login, tidak perlu parameter (undefined)
  Main: NavigatorScreenParams<AdminTabParamList | MemberTabParamList>;  // Layar utama setelah login
};

/**
 * AdminTabParamList - Daftar tab untuk Admin
 * 
 * Tab Navigator menampilkan menu di bagian bawah layar
 * Admin memiliki 5 tab: Dashboard, Buku, Anggota, Pengembalian, Profil
 */
export type AdminTabParamList = {
  AdminDashboard: undefined;  // Tab dashboard ringkasan
  AdminBooks: undefined;      // Tab daftar buku (dengan search & tambah buku)
  AdminMembers: undefined;    // Tab daftar anggota dan peminjaman
  ReturnBook: undefined;      // Tab proses pengembalian
  AdminProfile: undefined;    // Tab profil admin
};

/**
 * MemberTabParamList - Daftar tab untuk Anggota Perpustakaan
 * 
 * Anggota memiliki 3 tab: Perpustakaan, Riwayat, Profil
 */
export type MemberTabParamList = {
  BookList: undefined;       // Tab daftar buku perpustakaan
  MyHistory: undefined;      // Tab riwayat peminjaman
  MemberProfile: undefined;  // Tab profil anggota
};

/**
 * SharedStackParamList - Layar yang bisa diakses dari Admin maupun Member
 * 
 * Contoh: Detail buku bisa diakses dari kedua role
 */
export type SharedStackParamList = {
  BookDetail: { bookId: string };  // Layar detail buku, perlu parameter bookId
  EditBook: { bookId: string };    // Layar edit buku, perlu parameter bookId
};

// Gabungan navigasi untuk Admin (Tab + Shared screens)
export type AdminStackParamList = AdminTabParamList & SharedStackParamList;

// Gabungan navigasi untuk Member (Tab + Shared screens)
export type MemberStackParamList = MemberTabParamList & SharedStackParamList;

// ============================================
// TIPE PROPS LAYAR
// Props adalah data yang diterima oleh sebuah komponen/layar
// Tipe ini membantu kita tahu props apa saja yang tersedia di setiap layar
// ============================================

// Props untuk layar Login
export type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;

// Props untuk layar-layar Admin
export type AdminBooksScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'AdminBooks'>,
  StackScreenProps<RootStackParamList>
>;

export type AddBookScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'AddBook'>,
  StackScreenProps<RootStackParamList>
>;

export type ReturnBookScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'ReturnBook'>,
  StackScreenProps<RootStackParamList>
>;

// Props untuk layar-layar Member
export type BookListScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MemberTabParamList, 'BookList'>,
  StackScreenProps<RootStackParamList>
>;

export type MyHistoryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MemberTabParamList, 'MyHistory'>,
  StackScreenProps<RootStackParamList>
>;

// Props untuk layar yang dipakai bersama
export type BookDetailScreenProps = StackScreenProps<SharedStackParamList, 'BookDetail'>;
export type EditBookScreenProps = StackScreenProps<SharedStackParamList, 'EditBook'>;

// ============================================
// TIPE CONTEXT
// Context digunakan untuk berbagi data ke seluruh aplikasi tanpa prop drilling
// Prop drilling = mengirim props dari parent ke child ke grandchild dst (ribet!)
// ============================================

/**
 * AuthContextState - State/data yang disimpan di Auth Context
 */
export interface AuthContextState {
  user: User | null;      // Data user yang sedang login (null jika belum login)
  isLoading: boolean;     // True jika sedang memproses (login/logout/cek auth)
  isAuthenticated: boolean;  // True jika user sudah login
}

/**
 * AuthContextActions - Fungsi-fungsi yang tersedia di Auth Context
 */
export interface AuthContextActions {
  login: (email: string, password: string) => Promise<void>;  // Fungsi untuk login
  logout: () => Promise<void>;  // Fungsi untuk logout
  register: (email: string, password: string, name: string, role: 'admin' | 'member') => Promise<void>;  // Fungsi untuk register
  updateProfile: (name: string) => Promise<void>;  // Fungsi untuk update profil
}

/**
 * AuthContextType - Gabungan State dan Actions
 * Ini adalah tipe lengkap dari Auth Context
 */
export type AuthContextType = AuthContextState & AuthContextActions;

// ============================================
// TIPE FORM
// Tipe untuk data form input dari pengguna
// ============================================

/**
 * AddBookFormData - Data form untuk menambah buku baru
 */
export interface AddBookFormData {
  title: string;         // Input judul buku
  author: string;        // Input nama penulis
  description?: string;  // Input deskripsi (opsional)
  isbn?: string;         // Input ISBN (opsional)
  coverImage?: string;   // URI gambar sampul dari device (sebelum diupload)
}

/**
 * LoginFormData - Data form untuk login
 */
export interface LoginFormData {
  email: string;     // Input email
  password: string;  // Input password
}

/**
 * RegisterFormData - Data form untuk registrasi
 */
export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'member';
}

// ============================================
// TIPE RESPONSE API
// Tipe untuk response dari fungsi-fungsi helper
// ============================================

/**
 * ApiResponse - Format standar response dari fungsi helper
 * Generic type <T> artinya tipe data bisa berbeda-beda
 */
export interface ApiResponse<T> {
  success: boolean;  // True jika berhasil, false jika gagal
  data?: T;          // Data hasil (opsional, ada jika success = true)
  error?: string;    // Pesan error (opsional, ada jika success = false)
}

/**
 * BorrowBookResponse - Response setelah meminjam buku
 */
export interface BorrowBookResponse {
  transactionId: string;  // ID transaksi yang dibuat
  message: string;        // Pesan sukses
}

/**
 * ReturnBookResponse - Response setelah mengembalikan buku
 */
export interface ReturnBookResponse {
  transactionId: string;  // ID transaksi yang diupdate
  message: string;        // Pesan sukses
}

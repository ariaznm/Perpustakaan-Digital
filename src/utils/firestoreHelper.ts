import {
  collection,      // Membuat referensi ke collection
  doc,             // Membuat referensi ke dokumen
  getDoc,          // Mengambil satu dokumen
  getDocs,         // Mengambil banyak dokumen
  addDoc,          // Menambah dokumen baru (ID otomatis)
  updateDoc,       // Mengupdate dokumen
  deleteDoc,       // Menghapus dokumen
  query,           // Membuat query
  where,           // Filter query
  orderBy,         // Mengurutkan hasil query
  runTransaction,  // Menjalankan transaksi atomik
  serverTimestamp, // Timestamp dari server
  Timestamp,       // Tipe data timestamp Firestore
} from 'firebase/firestore';

// Import fungsi-fungsi Storage
import {
  ref,             // Membuat referensi ke file di Storage
  uploadBytes,     // Upload file sebagai bytes
  getDownloadURL,  // Mendapatkan URL download file
  deleteObject,    // Menghapus file
} from 'firebase/storage';

// Import instance Firebase dan konstanta
import { db, storage, COLLECTIONS, STORAGE_PATHS } from '../config/firebase';

// Import tipe data
import {
  Book,
  BookDoc,
  Transaction,
  TransactionDoc,
  User,
  BorrowBookResponse,
  ReturnBookResponse,
} from '../types';

// ============================================
// FUNGSI HELPER UPLOAD GAMBAR
// ============================================

/**
 * Mengubah URI gambar lokal menjadi Blob
 * 
 * APA ITU BLOB?
 * Blob (Binary Large Object) adalah format data biner
 * Firebase Storage membutuhkan format ini untuk upload
 */
export const uriToBlob = async (uri: string): Promise<Blob> => {
  // Fetch gambar dari URI lokal
  const response = await fetch(uri);
  // Konversi response ke Blob
  const blob = await response.blob();
  return blob;
};

/**
 * Upload gambar ke Firebase Storage
 * 
 * PROSES:
 * 1. Konversi URI ke Blob
 * 2. Buat referensi ke lokasi penyimpanan
 * 3. Upload Blob ke Storage
 * 4. Dapatkan URL download
 */
export const uploadImage = async (uri: string, fileName: string): Promise<string> => {
  try {
    // Konversi URI ke Blob
    const blob = await uriToBlob(uri);

    // Buat referensi ke lokasi penyimpanan
    // Path: book-covers/{fileName}
    const storageRef = ref(storage, `${STORAGE_PATHS.BOOK_COVERS}/${fileName}`);

    // Upload blob ke Storage
    const snapshot = await uploadBytes(storageRef, blob);

    // Dapatkan URL download
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error upload gambar:', error);
    throw new Error('Gagal upload gambar. Silakan coba lagi.');
  }
};

/**
 * Menghapus gambar dari Firebase Storage
 * 
 * @param url - URL gambar yang akan dihapus
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    // Buat referensi dari URL
    const storageRef = ref(storage, url);
    // Hapus file
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error hapus gambar:', error);
    // Tidak throw error karena gagal hapus gambar tidak kritis
  }
};

/**
 * Generate nama file unik untuk sampul buku
 * 
 * Format: {judul-buku}-{timestamp}.jpg
 * Contoh: harry-potter-1699123456789.jpg
 */
export const generateCoverFileName = (bookTitle: string): string => {
  // Ubah judul ke lowercase dan ganti karakter non-alfanumerik dengan dash
  const sanitizedTitle = bookTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
  // Tambahkan timestamp untuk keunikan
  const timestamp = Date.now();
  return `${sanitizedTitle}-${timestamp}.jpg`;
};

// ============================================
// OPERASI BUKU (CRUD)
// CRUD = Create, Read, Update, Delete
// ============================================

/**
 * Mengambil semua buku dari Firestore
 */
export const getAllBooks = async (): Promise<Book[]> => {
  try {
    // Buat referensi ke collection books
    const booksRef = collection(db, COLLECTIONS.BOOKS);

    // Buat query: urutkan berdasarkan tanggal dibuat (terbaru dulu)
    const q = query(booksRef, orderBy('createdAt', 'desc'));

    // Eksekusi query
    const querySnapshot = await getDocs(q);

    // Map hasil query ke array Book
    const books: Book[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as BookDoc;
      return {
        id: doc.id,  // ID dokumen
        ...data,     // Spread semua field dari dokumen
        // Konversi Timestamp Firestore ke Date JavaScript
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      };
    });

    return books;
  } catch (error) {
    console.error('Error mengambil buku:', error);
    throw new Error('Gagal mengambil daftar buku. Silakan coba lagi.');
  }
};

/**
 * Mengambil satu buku berdasarkan ID
 * 
 */
export const getBookById = async (bookId: string): Promise<Book | null> => {
  try {
    // Buat referensi ke dokumen buku
    const bookRef = doc(db, COLLECTIONS.BOOKS, bookId);

    // Ambil dokumen
    const bookSnap = await getDoc(bookRef);

    // Cek apakah dokumen ada
    if (!bookSnap.exists()) {
      return null;
    }

    // Konversi ke tipe Book
    const data = bookSnap.data() as BookDoc;
    return {
      id: bookSnap.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
    };
  } catch (error) {
    console.error('Error mengambil buku:', error);
    throw new Error('Gagal mengambil detail buku. Silakan coba lagi.');
  }
};

/**
 * Menambah buku baru ke Firestore
 * 
 * PROSES:
 * 1. Upload gambar sampul (jika ada)
 * 2. Set status ke AVAILABLE (buku baru selalu tersedia)
 * 3. Simpan dokumen ke Firestore
 * 
 */
export const addBook = async (
  bookData: Omit<BookDoc, 'coverUrl' | 'status' | 'createdAt' | 'updatedAt'>,
  coverImageUri?: string
): Promise<string> => {
  try {
    let coverUrl = '';

    // Upload gambar sampul jika ada
    if (coverImageUri) {
      const fileName = generateCoverFileName(bookData.title);
      coverUrl = await uploadImage(coverImageUri, fileName);
    }

    // Siapkan dokumen buku
    // Buku baru selalu memiliki status AVAILABLE
    const bookDoc: BookDoc = {
      title: bookData.title,
      author: bookData.author,
      coverUrl,
      status: 'AVAILABLE',
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    // Tambahkan field opsional hanya jika ada nilainya
    if (bookData.description !== undefined && bookData.description !== '') {
      bookDoc.description = bookData.description;
    }
    if (bookData.isbn !== undefined && bookData.isbn !== '') {
      bookDoc.isbn = bookData.isbn;
    }

    // Simpan ke Firestore (ID otomatis di-generate)
    const booksRef = collection(db, COLLECTIONS.BOOKS);
    const docRef = await addDoc(booksRef, bookDoc);

    return docRef.id;
  } catch (error) {
    console.error('Error menambah buku:', error);
    throw new Error('Gagal menambah buku. Silakan coba lagi.');
  }
};

/**
 * Mengupdate buku yang sudah ada
 * 
 */
export const updateBook = async (
  bookId: string,
  updates: Partial<Omit<BookDoc, 'createdAt'>>,
  newCoverImageUri?: string
): Promise<void> => {
  try {
    const bookRef = doc(db, COLLECTIONS.BOOKS, bookId);

    // Ambil data buku saat ini (untuk hapus gambar lama jika perlu)
    const currentBook = await getBookById(bookId);

    let coverUrl = updates.coverUrl;

    // Upload gambar baru jika ada
    if (newCoverImageUri) {
      const fileName = generateCoverFileName(updates.title || currentBook?.title || 'book');
      coverUrl = await uploadImage(newCoverImageUri, fileName);

      // Hapus gambar lama jika ada
      if (currentBook?.coverUrl) {
        await deleteImage(currentBook.coverUrl);
      }
    }

    // Update dokumen
    await updateDoc(bookRef, {
      ...updates,
      ...(coverUrl && { coverUrl }),  // Hanya tambahkan jika ada nilai
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error update buku:', error);
    throw new Error('Gagal update buku. Silakan coba lagi.');
  }
};

/**
 * Menghapus buku dari Firestore
 */
export const deleteBook = async (bookId: string): Promise<void> => {
  try {
    // Ambil data buku untuk hapus gambar
    const book = await getBookById(bookId);

    // Hapus gambar sampul jika ada
    if (book?.coverUrl) {
      await deleteImage(book.coverUrl);
    }

    // Hapus dokumen
    const bookRef = doc(db, COLLECTIONS.BOOKS, bookId);
    await deleteDoc(bookRef);
  } catch (error) {
    console.error('Error hapus buku:', error);
    throw new Error('Gagal hapus buku. Silakan coba lagi.');
  }
};

// ============================================
// OPERASI TRANSAKSI (PEMINJAMAN/PENGEMBALIAN)
// Menggunakan Firestore Transaction untuk atomicity
// 
// APA ITU ATOMICITY?
// Atomicity berarti semua operasi dalam transaksi harus berhasil semua,
// atau gagal semua. Tidak ada yang setengah-setengah.
// 
// Contoh: Saat meminjam buku:
// 1. Ubah status buku ke BORROWED
// 2. Buat record transaksi
// Kedua operasi ini harus berhasil bersama, atau gagal bersama.
// ============================================

/**
 * Meminjam buku - Menggunakan Firestore Transaction
 * 
 * PROSES:
 * 1. Cek apakah buku ada
 * 2. Cek apakah buku tersedia (status AVAILABLE)
 * 3. Ubah status buku ke BORROWED
 * 4. Buat record transaksi
 * 
 * Semua operasi di atas berjalan secara atomik (semua atau tidak sama sekali)
 */
export const borrowBook = async (
  bookId: string,
  user: User
): Promise<BorrowBookResponse> => {
  try {
    // runTransaction menjalankan operasi secara atomik
    const result = await runTransaction(db, async (transaction) => {
      // ===== LANGKAH 1: Ambil data buku =====
      const bookRef = doc(db, COLLECTIONS.BOOKS, bookId);
      const bookSnap = await transaction.get(bookRef);

      // Validasi: buku harus ada
      if (!bookSnap.exists()) {
        throw new Error('Buku tidak ditemukan.');
      }

      const bookData = bookSnap.data() as BookDoc;

      // ===== LANGKAH 2: Validasi ketersediaan =====
      if (bookData.status === 'BORROWED') {
        throw new Error('Buku sedang dipinjam.');
      }

      // ===== LANGKAH 3: Update status buku ke BORROWED =====
      transaction.update(bookRef, {
        status: 'BORROWED',
        updatedAt: serverTimestamp(),
      });

      // ===== LANGKAH 4: Buat record transaksi =====
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      const transactionDocRef = doc(transactionsRef);  // Generate ID baru

      const transactionData: TransactionDoc = {
        bookId,
        userId: user.uid,
        borrowDate: serverTimestamp() as any,
        returnDate: null,  // Belum dikembalikan
        status: 'BORROWED',
        bookTitle: bookData.title,  // Simpan judul untuk kemudahan tampilan
        userName: user.name,        // Simpan nama untuk kemudahan tampilan
      };

      transaction.set(transactionDocRef, transactionData);

      // Return ID transaksi
      return transactionDocRef.id;
    });

    return {
      transactionId: result,
      message: 'Buku berhasil dipinjam!',
    };
  } catch (error: any) {
    console.error('Error meminjam buku:', error);
    throw new Error(error.message || 'Gagal meminjam buku. Silakan coba lagi.');
  }
};

/**
 * Mengembalikan buku - Menggunakan Firestore Transaction
 * 
 * PROSES:
 * 1. Cek apakah transaksi ada
 * 2. Cek apakah belum dikembalikan
 * 3. Ubah status buku ke AVAILABLE
 * 4. Update status transaksi
 */
export const returnBook = async (transactionId: string): Promise<ReturnBookResponse> => {
  try {
    await runTransaction(db, async (transaction) => {
      // ===== LANGKAH 1: Ambil data transaksi =====
      const transactionRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
      const transactionSnap = await transaction.get(transactionRef);

      // Validasi: transaksi harus ada
      if (!transactionSnap.exists()) {
        throw new Error('Transaksi tidak ditemukan.');
      }

      const transactionData = transactionSnap.data() as TransactionDoc;

      // ===== LANGKAH 2: Validasi status =====
      if (transactionData.status === 'RETURNED') {
        throw new Error('Buku sudah dikembalikan sebelumnya.');
      }

      // ===== LANGKAH 3: Ambil data buku =====
      const bookRef = doc(db, COLLECTIONS.BOOKS, transactionData.bookId);
      const bookSnap = await transaction.get(bookRef);

      if (!bookSnap.exists()) {
        throw new Error('Buku tidak ditemukan.');
      }

      // ===== LANGKAH 4: Update status buku ke AVAILABLE =====
      transaction.update(bookRef, {
        status: 'AVAILABLE',
        updatedAt: serverTimestamp(),
      });

      // ===== LANGKAH 5: Update status transaksi =====
      transaction.update(transactionRef, {
        status: 'RETURNED',
        returnDate: serverTimestamp(),
      });
    });

    return {
      transactionId,
      message: 'Buku berhasil dikembalikan!',
    };
  } catch (error: any) {
    console.error('Error mengembalikan buku:', error);
    throw new Error(error.message || 'Gagal mengembalikan buku. Silakan coba lagi.');
  }
};

// ============================================
// QUERY TRANSAKSI
// ============================================

/**
 * Mengambil semua transaksi yang masih dipinjam (untuk Admin)
 */
export const getBorrowedTransactions = async (): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);

    // Query: status = BORROWED, urutkan berdasarkan tanggal pinjam (terbaru dulu)
    const q = query(
      transactionsRef,
      where('status', '==', 'BORROWED'),
      orderBy('borrowDate', 'desc')
    );

    const querySnapshot = await getDocs(q);

    // Map hasil ke array Transaction
    const transactions: Transaction[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as TransactionDoc;
      return {
        id: doc.id,
        ...data,
        // Konversi Timestamp ke Date
        borrowDate: data.borrowDate instanceof Timestamp ? data.borrowDate.toDate() : data.borrowDate,
        returnDate: data.returnDate instanceof Timestamp ? data.returnDate.toDate() : data.returnDate,
      };
    });

    return transactions;
  } catch (error) {
    console.error('Error mengambil transaksi:', error);
    throw new Error('Gagal mengambil daftar transaksi. Silakan coba lagi.');
  }
};

/**
 * Mengambil riwayat transaksi user tertentu (untuk Member)
 */
export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);

    // Query: userId = userId, urutkan berdasarkan tanggal pinjam
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('borrowDate', 'desc')
    );

    const querySnapshot = await getDocs(q);

    const transactions: Transaction[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as TransactionDoc;
      return {
        id: doc.id,
        ...data,
        borrowDate: data.borrowDate instanceof Timestamp ? data.borrowDate.toDate() : data.borrowDate,
        returnDate: data.returnDate instanceof Timestamp ? data.returnDate.toDate() : data.returnDate,
      };
    });

    return transactions;
  } catch (error) {
    console.error('Error mengambil riwayat:', error);
    throw new Error('Gagal mengambil riwayat peminjaman. Silakan coba lagi.');
  }
};

/**
 * Cek apakah user sudah meminjam buku tertentu
 * 
 * Digunakan untuk mencegah user meminjam buku yang sama dua kali
 */
export const hasUserBorrowedBook = async (userId: string, bookId: string): Promise<boolean> => {
  try {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);

    // Query: cari transaksi dengan userId, bookId, dan status BORROWED
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('bookId', '==', bookId),
      where('status', '==', 'BORROWED')
    );

    const querySnapshot = await getDocs(q);

    // Jika ada hasil, berarti user sudah meminjam buku ini
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error cek status pinjam:', error);
    return false;  // Default: anggap belum pinjam
  }
};

// ============================================
// QUERY USERS (ADMIN)
// ============================================

/**
 * Mengambil semua user dengan role 'member'
 * 
 */
export const getAllMembers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);

    // Query: ambil user dengan role member
    // Note: Tidak menggunakan orderBy untuk menghindari kebutuhan composite index
    const q = query(
      usersRef,
      where('role', '==', 'member')
    );

    const querySnapshot = await getDocs(q);

    const members: User[] = querySnapshot.docs.map((doc) => ({
      uid: doc.id,
      email: doc.data().email,
      name: doc.data().name,
      role: doc.data().role,
    }));

    // Sort by name in JavaScript
    members.sort((a, b) => a.name.localeCompare(b.name));

    return members;
  } catch (error) {
    console.error('Error mengambil member:', error);
    throw new Error('Gagal mengambil daftar anggota. Silakan coba lagi.');
  }
};

/**
 * Interface untuk member dengan data peminjaman
 */
export interface MemberWithBorrows {
  user: User;
  borrowedBooks: Transaction[];
}

/**
 * Mengambil semua member beserta buku yang sedang dipinjam
 * 
 */
export const getAllMembersWithBorrows = async (): Promise<MemberWithBorrows[]> => {
  try {
    // Ambil semua member
    const members = await getAllMembers();

    // Ambil semua transaksi yang masih dipinjam
    const borrowedTransactions = await getBorrowedTransactions();

    // Gabungkan data member dengan transaksi mereka
    const membersWithBorrows: MemberWithBorrows[] = members.map((member) => ({
      user: member,
      borrowedBooks: borrowedTransactions.filter((t) => t.userId === member.uid),
    }));

    return membersWithBorrows;
  } catch (error) {
    console.error('Error mengambil member dengan peminjaman:', error);
    throw new Error('Gagal mengambil data anggota. Silakan coba lagi.');
  }
};

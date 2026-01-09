import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// Import fungsi autentikasi dari Firebase
import {
  signInWithEmailAndPassword,  // Fungsi untuk login
  createUserWithEmailAndPassword,  // Fungsi untuk register
  signOut,  // Fungsi untuk logout
  onAuthStateChanged,  // Listener untuk memantau status login
  User as FirebaseUser,  // Tipe data user dari Firebase
} from 'firebase/auth';

// Import fungsi Firestore untuk menyimpan data user
import {
  doc,  // Membuat referensi ke dokumen
  getDoc,  // Mengambil satu dokumen
  setDoc,  // Menyimpan dokumen
  updateDoc,  // Mengupdate dokumen
  serverTimestamp,  // Timestamp dari server
} from 'firebase/firestore';

// Import instance Firebase dan tipe data
import { auth, db, COLLECTIONS } from '../config/firebase';
import { User, AuthContextType, UserDoc } from '../types';

// ============================================
// MEMBUAT CONTEXT
// ============================================

/**
 * Membuat Auth Context dengan nilai default undefined
 * Nilai sebenarnya akan diisi oleh Provider
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// KOMPONEN PROVIDER
// Provider adalah komponen yang "menyediakan" data ke semua child-nya
// ============================================

// Tipe props untuk AuthProvider
interface AuthProviderProps {
  children: ReactNode;  // ReactNode = bisa berisi komponen React apapun
}

/**
 * AuthProvider - Komponen yang membungkus aplikasi dan menyediakan state autentikasi
 * 
 * CARA PAKAI:
 * Di App.tsx, bungkus aplikasi dengan AuthProvider:
 * <AuthProvider>
 *   <AppNavigator />
 * </AuthProvider>
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ============================================
  // STATE
  // State adalah data yang bisa berubah dan akan memicu re-render
  // ============================================

  // State untuk menyimpan data user yang sedang login
  // null artinya belum ada user yang login
  const [user, setUser] = useState<User | null>(null);

  // State untuk menandakan sedang loading (proses autentikasi)
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ============================================
  // FUNGSI HELPER
  // ============================================

  /**
   * Mengambil profil user dari Firestore
   * 
   * Kenapa perlu ini?
   * Firebase Auth hanya menyimpan email dan uid
   * Data tambahan seperti nama dan role disimpan di Firestore
   * 
   * @param firebaseUser - User dari Firebase Auth
   * @returns User lengkap dengan role, atau null jika tidak ditemukan
   */
  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      // Buat referensi ke dokumen user di Firestore
      // Path: users/{uid}
      const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);

      // Ambil dokumen dari Firestore
      const userDocSnap = await getDoc(userDocRef);

      // Cek apakah dokumen ada
      if (userDocSnap.exists()) {
        // Ambil data dari dokumen
        const userData = userDocSnap.data() as UserDoc;

        // Gabungkan data dari Auth dan Firestore
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: userData.role,
          name: userData.name,
        };
      }

      // Dokumen tidak ditemukan
      console.warn('Dokumen user tidak ditemukan di Firestore');
      return null;
    } catch (error) {
      console.error('Error mengambil profil user:', error);
      return null;
    }
  }, []);  // useCallback dengan dependency kosong = fungsi tidak akan dibuat ulang

  // ============================================
  // LISTENER STATUS AUTENTIKASI
  // ============================================

  /**
   * useEffect untuk memantau perubahan status login
   * 
   * onAuthStateChanged akan dipanggil setiap kali:
   * - User login
   * - User logout
   * - Aplikasi pertama kali dibuka (cek session)
   */
  useEffect(() => {
    // Subscribe ke perubahan status auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);

      if (firebaseUser) {
        // User sudah login, ambil profil lengkapnya
        const userProfile = await fetchUserProfile(firebaseUser);
        setUser(userProfile);
      } else {
        // User belum login atau sudah logout
        setUser(null);
      }

      setIsLoading(false);
    });

    // Cleanup function - dipanggil saat komponen unmount
    // Penting untuk menghindari memory leak
    return () => unsubscribe();
  }, [fetchUserProfile]);

  // ============================================
  // FUNGSI LOGIN
  // ============================================

  /**
   * Fungsi untuk login dengan email dan password
   * 
   * @param email - Email pengguna
   * @param password - Password pengguna
   * @throws Error jika login gagal
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);

      // Login ke Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Ambil profil lengkap dari Firestore
      const userProfile = await fetchUserProfile(userCredential.user);

      // Jika profil tidak ditemukan, logout dan tampilkan error
      if (!userProfile) {
        await signOut(auth);
        throw new Error('Profil pengguna tidak ditemukan. Silakan hubungi administrator.');
      }

      setUser(userProfile);
    } catch (error: any) {
      console.error('Error login:', error);

      // Terjemahkan error Firebase ke pesan yang lebih user-friendly
      let errorMessage = 'Login gagal. Silakan coba lagi.';

      // Cek kode error dari Firebase
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email tidak terdaftar.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password salah.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Terlalu banyak percobaan gagal. Coba lagi nanti.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    } finally {
      // finally selalu dijalankan, baik sukses maupun error
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  // ============================================
  // FUNGSI REGISTER
  // ============================================

  /**
   * Fungsi untuk mendaftarkan user baru
   * 
   * Proses:
   * 1. Buat akun di Firebase Auth
   * 2. Simpan data tambahan (nama, role) di Firestore
   * 
   * @param email - Email pengguna
   * @param password - Password (minimal 6 karakter)
   * @param name - Nama lengkap
   * @param role - Peran: 'admin' atau 'member'
   */
  const register = useCallback(async (
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'member'
  ): Promise<void> => {
    try {
      setIsLoading(true);

      // Buat akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Siapkan data untuk disimpan di Firestore
      const userDocRef = doc(db, COLLECTIONS.USERS, userCredential.user.uid);
      const userDocData: UserDoc = {
        email,
        name,
        role,
        createdAt: serverTimestamp() as any,  // Timestamp dari server Firebase
      };

      // Simpan ke Firestore
      await setDoc(userDocRef, userDocData);

      // Update state
      setUser({
        uid: userCredential.user.uid,
        email,
        name,
        role,
      });
    } catch (error: any) {
      console.error('Error registrasi:', error);

      // Terjemahkan error
      let errorMessage = 'Registrasi gagal. Silakan coba lagi.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah terdaftar.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // FUNGSI LOGOUT
  // ============================================

  /**
   * Fungsi untuk logout
   * Akan menghapus session dan mengarahkan ke halaman login
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await signOut(auth);  // Logout dari Firebase
      setUser(null);  // Reset state user
    } catch (error: any) {
      console.error('Error logout:', error);
      throw new Error('Logout gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // FUNGSI UPDATE PROFILE
  // ============================================

  /**
   * Fungsi untuk mengupdate profil user (nama)
   * 
   * PENTING: Tidak menggunakan setIsLoading(true) agar tidak trigger
   * LoadingScreen di AppNavigator yang akan mereset navigasi
   * 
   * @param name - Nama baru pengguna
   */
  const updateProfile = useCallback(async (name: string): Promise<void> => {
    try {
      if (!user) {
        throw new Error('Tidak ada user yang login.');
      }

      // Note: Tidak set isLoading = true untuk menghindari reset navigasi
      // Loading state ditangani di komponen ProfileScreen

      // Update di Firestore
      const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
      await updateDoc(userDocRef, {
        name,
        updatedAt: serverTimestamp(),
      });

      // Update state lokal
      setUser((prev) => prev ? { ...prev, name } : null);
    } catch (error: any) {
      console.error('Error update profil:', error);
      throw new Error('Gagal mengupdate profil. Silakan coba lagi.');
    }
  }, [user]);

  // ============================================
  // NILAI CONTEXT
  // Ini adalah data yang akan tersedia di seluruh aplikasi
  // ============================================

  const contextValue: AuthContextType = {
    user,  // Data user yang login
    isLoading,  // Status loading
    isAuthenticated: !!user,  // !! mengubah nilai ke boolean (true jika user ada)
    login,  // Fungsi login
    logout,  // Fungsi logout
    register,  // Fungsi register
    updateProfile,  // Fungsi update profil
  };

  // Render Provider dengan value
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// CUSTOM HOOK
// Hook adalah fungsi yang bisa menggunakan fitur React (state, effect, context)
// ============================================

/**
 * useAuth - Custom hook untuk mengakses Auth Context
 * 
 * CARA PAKAI:
 * const { user, login, logout } = useAuth();
 * 
 * @returns AuthContextType - state dan fungsi autentikasi
 * @throws Error jika digunakan di luar AuthProvider
 */
export const useAuth = (): AuthContextType => {
  // Ambil nilai dari context
  const context = useContext(AuthContext);

  // Validasi: pastikan hook digunakan di dalam Provider
  if (context === undefined) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }

  return context;
};

// Export default untuk kemudahan import
export default AuthContext;

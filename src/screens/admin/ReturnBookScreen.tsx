import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Hook untuk menjalankan efek saat layar difokuskan
import { useFocusEffect } from '@react-navigation/native';

// Import tipe data dan fungsi helper
import { Transaction } from '../../types';
import { getBorrowedTransactions, returnBook } from '../../utils/firestoreHelper';

// ============================================
// KOMPONEN RETURN BOOK SCREEN
// ============================================

const ReturnBookScreen: React.FC = () => {
  // ============================================
  // STATE
  // ============================================

  // State untuk menyimpan daftar transaksi peminjaman
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // State loading (saat pertama kali load)
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State refreshing (saat pull to refresh)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // State untuk menyimpan ID transaksi yang sedang diproses
  // Digunakan untuk menampilkan loading indicator pada item tertentu
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ============================================
  // FUNGSI FETCH DATA
  // ============================================

  /**
   * Mengambil semua transaksi yang masih dipinjam dari Firestore
   * 
   * @param showLoader - Apakah tampilkan loading indicator utama
   */
  const fetchTransactions = useCallback(async (showLoader: boolean = true): Promise<void> => {
    try {
      // Tampilkan loading indicator jika diperlukan
      if (showLoader) setIsLoading(true);

      // Ambil data transaksi dengan status BORROWED dari Firestore
      const fetchedTransactions = await getBorrowedTransactions();
      setTransactions(fetchedTransactions);
    } catch (error: any) {
      // Tampilkan pesan error jika gagal
      Alert.alert('Error', error.message || 'Gagal mengambil data transaksi.');
    } finally {
      // Matikan semua loading indicator
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * useFocusEffect - Dipanggil setiap kali layar ini difokuskan
   * 
   * Berbeda dengan useEffect yang hanya dipanggil saat mount,
   * useFocusEffect dipanggil setiap kali user kembali ke layar ini
   * 
   * Berguna untuk memperbarui data setelah ada perubahan di layar lain
   */
  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  /**
   * Handler untuk pull to refresh
   */
  const handleRefresh = (): void => {
    setIsRefreshing(true);
    fetchTransactions(false);  // false = tidak tampilkan loading indicator utama
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  /**
   * Handler untuk proses pengembalian buku
   * Menampilkan dialog konfirmasi sebelum memproses
   * 
   * @param transaction - Data transaksi yang akan diproses
   */
  const handleReturn = (transaction: Transaction): void => {
    // Tampilkan dialog konfirmasi
    Alert.alert(
      'Konfirmasi Pengembalian',
      `Tandai "${transaction.bookTitle}" sebagai sudah dikembalikan oleh ${transaction.userName}?`,
      [
        // Tombol Batal
        { text: 'Batal', style: 'cancel' },
        // Tombol Konfirmasi
        {
          text: 'Konfirmasi',
          onPress: async () => {
            try {
              // Set ID transaksi yang sedang diproses (untuk loading indicator)
              setProcessingId(transaction.id);

              // Panggil fungsi returnBook dari firestoreHelper
              await returnBook(transaction.id);

              // Hapus transaksi dari state lokal (sudah tidak perlu ditampilkan)
              setTransactions((prev) =>
                prev.filter((t) => t.id !== transaction.id)
              );

              // Tampilkan pesan sukses
              Alert.alert('Sukses', 'Buku berhasil dikembalikan!');
            } catch (error: any) {
              // Tampilkan pesan error jika gagal
              Alert.alert('Error', error.message || 'Gagal memproses pengembalian.');
            } finally {
              // Reset processing ID
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  // ============================================
  // FUNGSI HELPER
  // ============================================

  /**
   * Format tanggal ke string yang mudah dibaca
   * 
   * @param date - Objek Date yang akan diformat
   * @returns String tanggal dalam format "Jan 1, 2024"
   */
  const formatDate = (date: Date): string => {
    // Cek apakah date valid
    if (!date) return 'N/A';

    // Pastikan date adalah objek Date
    const d = date instanceof Date ? date : new Date(date);

    // Format menggunakan toLocaleDateString
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Hitung jumlah hari sejak peminjaman
   * 
   * @param borrowDate - Tanggal peminjaman
   * @returns Jumlah hari sejak peminjaman
   */
  const getDaysBorrowed = (borrowDate: Date): number => {
    // Cek apakah borrowDate valid
    if (!borrowDate) return 0;

    // Pastikan borrowDate adalah objek Date
    const borrow = borrowDate instanceof Date ? borrowDate : new Date(borrowDate);
    const now = new Date();

    // Hitung selisih waktu dalam milidetik
    const diffTime = Math.abs(now.getTime() - borrow.getTime());

    // Konversi ke hari (1000ms * 60s * 60m * 24h = 1 hari dalam ms)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  /**
   * Render item transaksi dalam FlatList
   * 
   * @param item - Data transaksi
   */
  const renderTransactionItem = ({ item }: { item: Transaction }): React.ReactElement => {
    // Hitung jumlah hari peminjaman
    const daysBorrowed = getDaysBorrowed(item.borrowDate);

    // Cek apakah sudah lewat batas (14 hari)
    const isOverdue = daysBorrowed > 14;

    // Cek apakah item ini sedang diproses
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.transactionCard}>
        {/* ----- Info Buku dan Peminjam ----- */}
        <View style={styles.bookInfo}>
          {/* Icon buku dalam lingkaran */}
          <View style={styles.iconContainer}>
            <Ionicons name="book" size={24} color="#2196F3" />
          </View>

          {/* Judul buku dan nama peminjam */}
          <View style={styles.textContainer}>
            {/* Judul buku (maksimal 2 baris) */}
            <Text style={styles.bookTitle} numberOfLines={2}>
              {item.bookTitle || 'Buku Tidak Diketahui'}
            </Text>

            {/* Nama peminjam dengan icon */}
            <Text style={styles.userName}>
              <Ionicons name="person-outline" size={14} color="#666" />{' '}
              {item.userName || 'Pengguna Tidak Diketahui'}
            </Text>
          </View>
        </View>

        {/* ----- Detail Peminjaman ----- */}
        <View style={styles.detailsContainer}>
          {/* Baris tanggal pinjam */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tanggal Pinjam:</Text>
            <Text style={styles.detailValue}>{formatDate(item.borrowDate)}</Text>
          </View>

          {/* Baris jumlah hari */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lama Pinjam:</Text>
            <Text
              style={[
                styles.detailValue,
                isOverdue && styles.overdueText,  // Warna merah jika overdue
              ]}
            >
              {daysBorrowed} hari {isOverdue && '(Terlambat)'}
            </Text>
          </View>
        </View>

        {/* ----- Tombol Pengembalian ----- */}
        <TouchableOpacity
          style={[
            styles.returnButton,
            isProcessing && styles.returnButtonDisabled,  // Style disabled saat proses
          ]}
          onPress={() => handleReturn(item)}
          disabled={isProcessing}  // Disable saat sedang proses
        >
          {isProcessing ? (
            // Tampilkan loading indicator saat proses
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            // Tampilkan icon dan teks normal
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.returnButtonText}>Tandai Dikembalikan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render tampilan saat list kosong
   * Menampilkan pesan bahwa tidak ada peminjaman yang pending
   */
  const renderEmptyList = (): React.ReactElement => (
    <View style={styles.emptyContainer}>
      {/* Icon centang */}
      <Ionicons name="checkmark-done-circle-outline" size={80} color="#4CAF50" />

      {/* Judul */}
      <Text style={styles.emptyTitle}>Semua Beres!</Text>

      {/* Subtitle */}
      <Text style={styles.emptySubtitle}>
        Tidak ada pengembalian yang tertunda saat ini
      </Text>
    </View>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  // Tampilkan loading screen saat pertama kali load
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Memuat transaksi...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== STATISTIK HEADER ===== */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          {/* Icon jam pasir */}
          <Ionicons name="hourglass-outline" size={24} color="#FF9800" />

          {/* Jumlah transaksi pending */}
          <Text style={styles.statNumber}>{transactions.length}</Text>

          {/* Label */}
          <Text style={styles.statLabel}>Menunggu Pengembalian</Text>
        </View>
      </View>

      {/* ===== DAFTAR TRANSAKSI ===== */}
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}  // Key unik untuk setiap item
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && styles.emptyListContent,  // Style khusus jika kosong
        ]}
        ListEmptyComponent={renderEmptyList}  // Komponen saat list kosong
        refreshControl={
          // Pull to refresh
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}  // Warna spinner (Android)
          />
        }
        showsVerticalScrollIndicator={false}  // Sembunyikan scrollbar
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Container utama
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Loading screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  // Statistik header
  statsContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // List content
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,  // Agar empty component bisa di-center
  },

  // Card transaksi
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Info buku
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#E3F2FD',  // Biru muda
    borderRadius: 24,  // Setengah dari width/height = lingkaran
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Detail peminjaman
  detailsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  overdueText: {
    color: '#F44336',  // Merah untuk keterlambatan
  },

  // Tombol pengembalian
  returnButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',  // Hijau
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  returnButtonDisabled: {
    backgroundColor: '#A5D6A7',  // Hijau muda saat disabled
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ReturnBookScreen;

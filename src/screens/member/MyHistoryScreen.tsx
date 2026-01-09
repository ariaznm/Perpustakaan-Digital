

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Hook untuk menjalankan efek saat layar difokuskan
import { useFocusEffect } from '@react-navigation/native';

// Import hook autentikasi untuk ambil data user
import { useAuth } from '../../context/AuthContext';

// Import tipe data dan fungsi helper
import { Transaction } from '../../types';
import { getUserTransactions } from '../../utils/firestoreHelper';

// ============================================
// KOMPONEN MY HISTORY SCREEN
// ============================================

const MyHistoryScreen: React.FC = () => {
  // ============================================
  // HOOKS & STATE
  // ============================================

  // Ambil data user dari Auth Context
  const { user } = useAuth();

  // State untuk menyimpan semua transaksi
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // State loading (saat pertama kali load)
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State refreshing (saat pull to refresh)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // State untuk filter aktif ('all' | 'borrowed' | 'returned')
  const [filter, setFilter] = useState<'all' | 'borrowed' | 'returned'>('all');

  // ============================================
  // FUNGSI FETCH DATA
  // ============================================

  /**
   * Mengambil riwayat transaksi user dari Firestore
   * 
   * @param showLoader - Apakah tampilkan loading indicator utama
   */
  const fetchTransactions = useCallback(async (showLoader: boolean = true): Promise<void> => {
    // Pastikan user sudah login
    if (!user?.uid) return;

    try {
      // Tampilkan loading indicator jika diperlukan
      if (showLoader) setIsLoading(true);

      // Ambil data transaksi dari Firestore
      const fetchedTransactions = await getUserTransactions(user.uid);
      setTransactions(fetchedTransactions);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengambil riwayat.');
    } finally {
      // Matikan semua loading indicator
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.uid]);

  /**
   * useFocusEffect - Dipanggil setiap kali layar ini difokuskan
   * 
   * Berguna untuk memperbarui data setelah meminjam/mengembalikan buku
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
  // LOGIKA FILTER
  // ============================================

  /**
   * Filter transaksi berdasarkan status yang dipilih
   * 
   * - 'all': Tampilkan semua transaksi
   * - 'borrowed': Hanya tampilkan yang sedang dipinjam
   * - 'returned': Hanya tampilkan yang sudah dikembalikan
   */
  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'borrowed') return t.status === 'BORROWED';
    if (filter === 'returned') return t.status === 'RETURNED';
    return true;
  });

  // ============================================
  // FUNGSI HELPER
  // ============================================

  /**
   * Format tanggal ke string yang mudah dibaca
   * 
   * @param date - Objek Date yang akan diformat
   * @returns String tanggal dalam format "1 Jan 2024"
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
   * Mendapatkan warna berdasarkan status transaksi
   * 
   * @param status - Status transaksi ('BORROWED' | 'RETURNED')
   * @returns Kode warna hex
   */
  const getStatusColor = (status: string): string => {
    // Orange untuk dipinjam, hijau untuk dikembalikan
    return status === 'BORROWED' ? '#FF9800' : '#4CAF50';
  };

  /**
   * Mendapatkan icon berdasarkan status transaksi
   * 
   * @param status - Status transaksi ('BORROWED' | 'RETURNED')
   * @returns Nama icon Ionicons
   */
  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    // Jam pasir untuk dipinjam, centang untuk dikembalikan
    return status === 'BORROWED' ? 'hourglass-outline' : 'checkmark-circle-outline';
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  /**
   * Render tombol-tombol filter
   */
  const renderFilterButtons = (): React.ReactElement => (
    <View style={styles.filterContainer}>
      {/* Tombol filter Semua */}
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
          Semua
        </Text>
      </TouchableOpacity>

      {/* Tombol filter Dipinjam */}
      <TouchableOpacity
        style={[styles.filterButton, filter === 'borrowed' && styles.filterButtonActive]}
        onPress={() => setFilter('borrowed')}
      >
        <Text style={[styles.filterText, filter === 'borrowed' && styles.filterTextActive]}>
          Dipinjam
        </Text>
      </TouchableOpacity>

      {/* Tombol filter Dikembalikan */}
      <TouchableOpacity
        style={[styles.filterButton, filter === 'returned' && styles.filterButtonActive]}
        onPress={() => setFilter('returned')}
      >
        <Text style={[styles.filterText, filter === 'returned' && styles.filterTextActive]}>
          Dikembalikan
        </Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render item transaksi dalam FlatList
   * 
   * @param item - Data transaksi
   */
  const renderTransactionItem = ({ item }: { item: Transaction }): React.ReactElement => {
    // Dapatkan warna dan icon berdasarkan status
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <View style={styles.transactionCard}>
        {/* ----- Icon Status ----- */}
        {/* Background dengan opacity 20% dari warna status */}
        <View style={[styles.statusIconContainer, { backgroundColor: `${statusColor}20` }]}>
          <Ionicons name={statusIcon} size={24} color={statusColor} />
        </View>

        {/* ----- Info Transaksi ----- */}
        <View style={styles.transactionInfo}>
          {/* Judul buku (maksimal 2 baris) */}
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.bookTitle || 'Buku Tidak Diketahui'}
          </Text>

          {/* Container tanggal */}
          <View style={styles.dateContainer}>
            {/* Baris tanggal pinjam */}
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.dateLabel}>Dipinjam:</Text>
              <Text style={styles.dateValue}>{formatDate(item.borrowDate)}</Text>
            </View>

            {/* Baris tanggal kembali (hanya jika sudah dikembalikan) */}
            {item.status === 'RETURNED' && item.returnDate && (
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={14} color="#666" />
                <Text style={styles.dateLabel}>Dikembalikan:</Text>
                <Text style={styles.dateValue}>{formatDate(item.returnDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ----- Badge Status ----- */}
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.status === 'BORROWED' ? 'DIPINJAM' : 'DIKEMBALIKAN'}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render tampilan saat list kosong
   * Pesan berbeda tergantung filter yang aktif
   */
  const renderEmptyList = (): React.ReactElement => (
    <View style={styles.emptyContainer}>
      {/* Icon jam */}
      <Ionicons name="time-outline" size={80} color="#ccc" />

      {/* Judul */}
      <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>

      {/* Subtitle berbeda berdasarkan filter */}
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'Anda belum pernah meminjam buku'
          : filter === 'borrowed'
            ? 'Tidak ada buku yang sedang dipinjam'
            : 'Tidak ada buku yang sudah dikembalikan'}
      </Text>
    </View>
  );

  /**
   * Render statistik peminjaman
   * Menampilkan jumlah buku yang dipinjam dan dikembalikan
   */
  const renderStats = (): React.ReactElement => {
    // Hitung jumlah berdasarkan status
    const borrowedCount = transactions.filter((t) => t.status === 'BORROWED').length;
    const returnedCount = transactions.filter((t) => t.status === 'RETURNED').length;

    return (
      <View style={styles.statsContainer}>
        {/* Card statistik: Sedang Dipinjam */}
        <View style={styles.statCard}>
          <Ionicons name="book-outline" size={24} color="#FF9800" />
          <Text style={styles.statNumber}>{borrowedCount}</Text>
          <Text style={styles.statLabel}>Sedang Dipinjam</Text>
        </View>

        {/* Card statistik: Sudah Dikembalikan */}
        <View style={styles.statCard}>
          <Ionicons name="checkmark-done-outline" size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>{returnedCount}</Text>
          <Text style={styles.statLabel}>Sudah Dikembalikan</Text>
        </View>
      </View>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  // Tampilkan loading screen saat pertama kali load
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Memuat riwayat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}  // Key unik untuk setiap item
        contentContainerStyle={[
          styles.listContent,
          filteredTransactions.length === 0 && styles.emptyListContent,  // Style khusus jika kosong
        ]}
        ListHeaderComponent={
          // Header berisi statistik dan tombol filter
          <>
            {renderStats()}
            {renderFilterButtons()}
          </>
        }
        ListEmptyComponent={renderEmptyList}  // Komponen saat list kosong
        refreshControl={
          // Pull to refresh
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}  // Warna spinner (Android)
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

  // List content
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,  // Agar empty component bisa di-center
  },

  // Statistik
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },

  // Tombol filter
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',  // Hijau saat aktif
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',  // Putih saat aktif
  },

  // Card transaksi
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Icon status
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,  // Setengah dari width/height = lingkaran
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info transaksi
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },

  // Container tanggal
  dateContainer: {
    gap: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },

  // Badge status
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
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

export default MyHistoryScreen;

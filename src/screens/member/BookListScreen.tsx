

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Hook navigasi
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Import tipe dan helper
import { Book } from '../../types';
import { getAllBooks } from '../../utils/firestoreHelper';
import { useDebounce } from '../../hooks/useDebounce';

// ============================================
// TIPE NAVIGASI
// ============================================

// Tipe untuk navigation prop
type NavigationProp = StackNavigationProp<any>;

// ============================================
// KOMPONEN BOOK LIST SCREEN
// ============================================

const BookListScreen: React.FC = () => {
  // ============================================
  // HOOKS & STATE
  // ============================================

  // Hook navigasi untuk berpindah layar
  const navigation = useNavigation<NavigationProp>();

  // State untuk menyimpan semua buku (data asli)
  const [books, setBooks] = useState<Book[]>([]);

  // State untuk buku yang ditampilkan (hasil filter pencarian)
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  // State loading (saat pertama kali load)
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State refreshing (saat pull to refresh)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // State untuk kata kunci pencarian
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Debounced search query - menunggu 500ms setelah user berhenti mengetik
  const debouncedQuery = useDebounce(searchQuery, 500);

  // ============================================
  // FUNGSI FETCH DATA
  // ============================================

  /**
   * Mengambil semua buku dari Firestore
   * 
   * @param showLoader - Apakah tampilkan loading indicator
   */
  const fetchBooks = useCallback(async (showLoader: boolean = true): Promise<void> => {
    try {
      // Tampilkan loading indicator jika diperlukan
      if (showLoader) setIsLoading(true);

      // Ambil data dari Firestore
      const fetchedBooks = await getAllBooks();

      // Simpan ke kedua state (asli dan filtered)
      setBooks(fetchedBooks);
      setFilteredBooks(fetchedBooks);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengambil data buku.');
    } finally {
      // Matikan semua loading indicator
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * useFocusEffect - Dipanggil setiap kali layar ini difokuskan
   * 
   * Berguna untuk memperbarui data setelah kembali dari layar detail
   * (misal setelah meminjam buku)
   */
  useFocusEffect(
    useCallback(() => {
      fetchBooks();
    }, [fetchBooks])
  );

  /**
   * Handler untuk pull to refresh
   */
  const handleRefresh = (): void => {
    setIsRefreshing(true);
    fetchBooks(false);  // false = tidak tampilkan loading indicator utama
  };

  // ============================================
  // FILTER BERDASARKAN DEBOUNCED QUERY
  // ============================================

  useEffect(() => {
    // Filter hanya dijalankan ketika debouncedQuery berubah
    if (!debouncedQuery.trim()) {
      setFilteredBooks(books);
      return;
    }

    const lowercaseQuery = debouncedQuery.toLowerCase();
    const filtered = books.filter(
      (book) =>
        book.title.toLowerCase().includes(lowercaseQuery) ||
        book.author.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredBooks(filtered);
  }, [debouncedQuery, books]);

  // ============================================
  // FUNGSI PENCARIAN
  // ============================================

  /**
   * Handler untuk input pencarian
   * Hanya update searchQuery, filter akan dijalankan oleh useDebounce
   * 
   * @param query - Kata kunci pencarian
   */
  const handleSearch = (query: string): void => {
    setSearchQuery(query);
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  /**
   * Handler saat item buku diklik
   * Navigasi ke layar detail buku
   */
  const handleBookPress = (book: Book): void => {
    navigation.navigate('BookDetail', { bookId: book.id });
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  /**
   * Render item buku dalam FlatList
   * 
   * Menampilkan card buku dengan:
   * - Gambar sampul
   * - Badge status ketersediaan
   * - Judul, penulis, dan info stok
   * 
   * @param item - Data buku
   */
  const renderBookItem = ({ item }: { item: Book }): React.ReactElement => {
    // Cek status ketersediaan
    const isAvailable = item.status === 'AVAILABLE';

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.7}  // Opacity saat ditekan
      >
        {/* ----- Container Gambar Sampul ----- */}
        <View style={styles.coverContainer}>
          {item.coverUrl ? (
            // Jika ada gambar, tampilkan
            <Image source={{ uri: item.coverUrl }} style={styles.coverImage} />
          ) : (
            // Jika tidak ada, tampilkan placeholder
            <View style={styles.placeholderCover}>
              <Ionicons name="book" size={40} color="#ccc" />
            </View>
          )}

          {/* Badge status ketersediaan (di pojok kanan atas) */}
          <View
            style={[
              styles.availabilityBadge,
              isAvailable ? styles.availableBadge : styles.unavailableBadge,
            ]}
          >
            <Text style={styles.availabilityText}>
              {isAvailable ? 'Tersedia' : 'Dipinjam'}
            </Text>
          </View>
        </View>

        {/* ----- Info Buku ----- */}
        <View style={styles.bookInfo}>
          {/* Judul buku (maksimal 2 baris) */}
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Nama penulis (maksimal 1 baris) */}
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.author}
          </Text>

        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render tampilan saat list kosong
   * Menampilkan pesan berbeda tergantung ada query pencarian atau tidak
   */
  const renderEmptyList = (): React.ReactElement => (
    <View style={styles.emptyContainer}>
      {searchQuery ? (
        // Jika ada query pencarian tapi tidak ada hasil
        <>
          <Ionicons name="search-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Tidak Ditemukan</Text>
          <Text style={styles.emptySubtitle}>
            Coba cari dengan kata kunci lain
          </Text>
        </>
      ) : (
        // Jika tidak ada buku sama sekali
        <>
          <Ionicons name="library-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Belum Ada Buku</Text>
          <Text style={styles.emptySubtitle}>
            Cek kembali nanti untuk buku terbaru
          </Text>
        </>
      )}
    </View>
  );

  /**
   * Render header (search bar dan jumlah hasil)
   */
  const renderHeader = (): React.ReactElement => (
    <View style={styles.headerContainer}>
      {/* ----- Search Bar ----- */}
      <View style={styles.searchContainer}>
        {/* Icon search */}
        <Ionicons name="search-outline" size={20} color="#666" />

        {/* Input pencarian */}
        <TextInput
          style={styles.searchInput}
          placeholder="Cari buku atau penulis..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />

        {/* Tombol clear (hanya muncul jika ada teks) */}
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* ----- Jumlah Hasil ----- */}
      <Text style={styles.resultsCount}>
        {filteredBooks.length} {filteredBooks.length === 1 ? 'buku' : 'buku'} ditemukan
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
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Memuat perpustakaan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* FlatList dengan grid 2 kolom */}
      <FlatList
        data={filteredBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}  // Key unik untuk setiap item
        numColumns={2}  // Tampilkan 2 kolom
        columnWrapperStyle={styles.row}  // Style untuk setiap baris
        contentContainerStyle={[
          styles.listContent,
          filteredBooks.length === 0 && styles.emptyListContent,  // Style khusus jika kosong
        ]}
        ListHeaderComponent={renderHeader}  // Search bar di atas list
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
        keyboardShouldPersistTaps="handled"  // Jaga keyboard tetap terbuka saat scroll/tap
        keyboardDismissMode="none"  // Jangan tutup keyboard saat scroll
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

  // Header (search bar)
  headerContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginLeft: 4,
  },

  // List content
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,  // Agar empty component bisa di-center
  },
  row: {
    justifyContent: 'space-between',  // Spasi antara 2 kolom
  },

  // Card buku
  bookCard: {
    width: '48%',  // Sedikit kurang dari 50% untuk memberikan gap
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',  // Agar gambar tidak keluar dari rounded corner
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Gambar sampul
  coverContainer: {
    width: '100%',
    height: 180,
    position: 'relative',  // Untuk positioning badge
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Badge ketersediaan
  availabilityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availableBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',  // Hijau dengan opacity
  },
  unavailableBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',  // Merah dengan opacity
  },
  availabilityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Info buku
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
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

export default BookListScreen;

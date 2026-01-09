import React, { useState, useCallback, useMemo } from 'react';
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
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Hook navigasi
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Library untuk memilih gambar dari galeri
import * as ImagePicker from 'expo-image-picker';

// Import tipe dan helper
import { Book } from '../../types';
import { getAllBooks, addBook } from '../../utils/firestoreHelper';
import { useDebounce } from '../../hooks/useDebounce';

// ============================================
// TIPE NAVIGASI
// ============================================

type NavigationProp = StackNavigationProp<any>;

// ============================================
// KOMPONEN ADD BOOK MODAL
// ============================================

interface AddBookModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddBookModal: React.FC<AddBookModalProps> = ({ visible, onClose, onSuccess }) => {
  // State untuk input form
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isbn, setIsbn] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset form
  const resetForm = (): void => {
    setTitle('');
    setAuthor('');
    setDescription('');
    setIsbn('');
    setCoverImage(null);
  };

  // Pilih gambar
  const pickImage = async (): Promise<void> => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin Diperlukan', 'Aplikasi membutuhkan izin untuk mengakses galeri foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih gambar. Silakan coba lagi.');
    }
  };

  // Submit form
  const handleSubmit = async (): Promise<void> => {
    // Validasi
    if (!title.trim()) {
      Alert.alert('Error', 'Judul buku harus diisi.');
      return;
    }
    if (!author.trim()) {
      Alert.alert('Error', 'Nama penulis harus diisi.');
      return;
    }

    try {
      setIsLoading(true);

      const bookData = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || undefined,
        isbn: isbn.trim() || undefined,
      };

      await addBook(bookData, coverImage || undefined);

      Alert.alert('Sukses', 'Buku berhasil ditambahkan!', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menambahkan buku.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} disabled={isLoading}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Tambah Buku Baru</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Picker */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Gambar Sampul</Text>
            {coverImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: coverImage }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setCoverImage(null)}
                  disabled={isLoading}
                >
                  <Ionicons name="close-circle" size={28} color="#F44336" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImage}
                disabled={isLoading}
              >
                <Ionicons name="image-outline" size={48} color="#999" />
                <Text style={styles.imagePickerText}>Ketuk untuk memilih gambar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Informasi Buku</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Judul Buku <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan judul buku"
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Penulis <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nama penulis"
                placeholderTextColor="#999"
                value={author}
                onChangeText={setAuthor}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ISBN (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nomor ISBN"
                placeholderTextColor="#999"
                value={isbn}
                onChangeText={setIsbn}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Deskripsi (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Masukkan deskripsi buku"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.loadingButtonText}>Menyimpan...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Tambah Buku</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// KOMPONEN ADMIN BOOKS SCREEN
// ============================================

const AdminBooksScreen: React.FC = () => {
  // ============================================
  // HOOKS & STATE
  // ============================================

  const navigation = useNavigation<NavigationProp>();

  // State untuk daftar buku
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // State untuk pencarian
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Debounced search query - menunggu 500ms setelah user berhenti mengetik
  const debouncedQuery = useDebounce(searchQuery, 500);

  // State untuk modal tambah buku
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);

  // ============================================
  // FILTERED BOOKS (PENCARIAN)
  // ============================================

  const filteredBooks = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return books;
    }

    const query = debouncedQuery.toLowerCase().trim();
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        (book.isbn && book.isbn.toLowerCase().includes(query))
    );
  }, [books, debouncedQuery]);

  // ============================================
  // FUNGSI FETCH DATA
  // ============================================

  const fetchBooks = useCallback(async (showLoader: boolean = true): Promise<void> => {
    try {
      if (showLoader) setIsLoading(true);
      const fetchedBooks = await getAllBooks();
      setBooks(fetchedBooks);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengambil data buku.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBooks();
    }, [fetchBooks])
  );

  const handleRefresh = (): void => {
    setIsRefreshing(true);
    fetchBooks(false);
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  const handleBookPress = (book: Book): void => {
    navigation.navigate('BookDetail', { bookId: book.id });
  };

  const handleAddBookSuccess = (): void => {
    fetchBooks(false);
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderBookItem = ({ item }: { item: Book }): React.ReactElement => {
    const isAvailable = item.status === 'AVAILABLE';

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.7}
      >
        {/* Gambar Sampul */}
        <View style={styles.coverContainer}>
          {item.coverUrl ? (
            <Image source={{ uri: item.coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.placeholderCover}>
              <Ionicons name="book" size={40} color="#ccc" />
            </View>
          )}
        </View>

        {/* Info Buku */}
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            oleh {item.author}
          </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                isAvailable ? styles.availableBadge : styles.borrowedBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isAvailable ? styles.availableText : styles.borrowedText,
                ]}
              >
                {isAvailable ? 'Tersedia' : 'Dipinjam'}
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron Indicator */}
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = (): React.ReactElement => (
    <View style={styles.emptyContainer}>
      <Ionicons name="library-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Tidak Ditemukan' : 'Belum Ada Buku'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `Tidak ada buku yang cocok dengan "${searchQuery}"`
          : 'Ketuk tombol + untuk menambahkan buku pertama'}
      </Text>
    </View>
  );

  const renderHeader = (): React.ReactElement => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari judul, penulis, atau ISBN..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Info */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {searchQuery
            ? `${filteredBooks.length} hasil ditemukan`
            : `${books.length} buku terdaftar`}
        </Text>
      </View>
    </View>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Memuat buku...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredBooks.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      />

      {/* FAB Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsAddModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Book Modal */}
      <AddBookModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSuccess={handleAddBookSuccess}
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

  // Header & Search
  headerContainer: {
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  resultsInfo: {
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },

  // List content
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
  },

  // Card buku
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Gambar sampul
  coverContainer: {
    width: 80,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
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

  // Info buku
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },

  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availableBadge: {
    backgroundColor: '#E8F5E9',
  },
  borrowedBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availableText: {
    color: '#4CAF50',
  },
  borrowedText: {
    color: '#F44336',
  },

  // Chevron container
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
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

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // ============================================
  // MODAL STYLES
  // ============================================

  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollContent: {
    padding: 16,
  },
  modalSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  // Image picker
  imagePicker: {
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  imagePreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  imagePreview: {
    width: 150,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: '25%',
    backgroundColor: '#fff',
    borderRadius: 14,
  },

  // Form inputs
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },

  // Submit button
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default AdminBooksScreen;

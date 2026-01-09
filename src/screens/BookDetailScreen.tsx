

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Hook navigasi untuk mengambil parameter dan navigasi
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';

// Import hook autentikasi untuk cek role user
import { useAuth } from '../context/AuthContext';

// Import tipe data dan fungsi helper
import { Book } from '../types';
import {
  getBookById,        // Ambil data buku berdasarkan ID
  borrowBook,         // Fungsi pinjam buku
  updateBook,         // Fungsi update buku
  deleteBook,         // Fungsi hapus buku
  hasUserBorrowedBook, // Cek apakah user sudah pinjam buku ini
} from '../utils/firestoreHelper';

// ============================================
// TIPE PARAMETER ROUTE
// ============================================

type RouteParams = {
  BookDetail: {
    bookId: string;
  };
};

// ============================================
// KOMPONEN EDIT BOOK DRAWER
// ============================================

interface EditBookDrawerProps {
  visible: boolean;
  onClose: () => void;
  book: Book;
  onSave: (data: { title: string; author: string; description: string }) => Promise<void>;
  isSaving: boolean;
}

const EditBookDrawer: React.FC<EditBookDrawerProps> = ({
  visible,
  onClose,
  book,
  onSave,
  isSaving,
}) => {
  const [title, setTitle] = useState<string>(book.title);
  const [author, setAuthor] = useState<string>(book.author);
  const [description, setDescription] = useState<string>(book.description || '');
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle(book.title);
      setAuthor(book.author);
      setDescription(book.description || '');
    }
  }, [visible, book]);

  // Listen to keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!title.trim()) {
      Alert.alert('Error', 'Judul buku harus diisi.');
      return;
    }
    if (!author.trim()) {
      Alert.alert('Error', 'Nama penulis harus diisi.');
      return;
    }
    await onSave({ title: title.trim(), author: author.trim(), description: description.trim() });
  };

  const handleClose = () => {
    if (!isSaving) {
      Keyboard.dismiss();
      onClose();
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={drawerStyles.keyboardAvoidingView}
        keyboardVerticalOffset={0}
      >
        <View style={drawerStyles.overlay}>
          {/* Overlay touchable to close - only when keyboard is hidden */}
          {!keyboardVisible && (
            <TouchableOpacity
              style={drawerStyles.overlayTouchable}
              onPress={handleClose}
              activeOpacity={1}
            />
          )}
          {/* When keyboard is visible, tap overlay to dismiss keyboard first */}
          {keyboardVisible && (
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
              <View style={drawerStyles.overlayTouchable} />
            </TouchableWithoutFeedback>
          )}

          <View style={drawerStyles.drawer}>
            {/* Handle Bar */}
            <View style={drawerStyles.handleBar} />

            {/* Header */}
            <View style={drawerStyles.header}>
              <Text style={drawerStyles.headerTitle}>Edit Buku</Text>
              <TouchableOpacity onPress={handleClose} disabled={isSaving}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView
              style={drawerStyles.formContainer}
              contentContainerStyle={drawerStyles.formContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Input Judul */}
              <View style={drawerStyles.inputGroup}>
                <Text style={drawerStyles.label}>
                  Judul Buku <Text style={drawerStyles.required}>*</Text>
                </Text>
                <TextInput
                  style={drawerStyles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Masukkan judul buku"
                  placeholderTextColor="#999"
                  editable={!isSaving}
                  returnKeyType="next"
                />
              </View>

              {/* Input Penulis */}
              <View style={drawerStyles.inputGroup}>
                <Text style={drawerStyles.label}>
                  Penulis <Text style={drawerStyles.required}>*</Text>
                </Text>
                <TextInput
                  style={drawerStyles.input}
                  value={author}
                  onChangeText={setAuthor}
                  placeholder="Masukkan nama penulis"
                  placeholderTextColor="#999"
                  editable={!isSaving}
                  returnKeyType="next"
                />
              </View>

              {/* Input Deskripsi */}
              <View style={drawerStyles.inputGroup}>
                <Text style={drawerStyles.label}>Deskripsi (Opsional)</Text>
                <TextInput
                  style={[drawerStyles.input, drawerStyles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Masukkan deskripsi buku"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isSaving}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
              </View>

              {/* Buttons */}
              <View style={drawerStyles.buttonRow}>
                <TouchableOpacity
                  style={drawerStyles.cancelButton}
                  onPress={handleClose}
                  disabled={isSaving}
                >
                  <Text style={drawerStyles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[drawerStyles.saveButton, isSaving && drawerStyles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={drawerStyles.saveButtonText}>Simpan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// KOMPONEN BOOK DETAIL SCREEN
// ============================================

const BookDetailScreen: React.FC = () => {
  // ============================================
  // HOOKS & STATE
  // ============================================

  const route = useRoute<RouteProp<RouteParams, 'BookDetail'>>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { bookId } = route.params;

  // State Data Buku
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBorrowing, setIsBorrowing] = useState<boolean>(false);
  const [hasBorrowed, setHasBorrowed] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // State untuk drawer edit
  const [isEditDrawerVisible, setIsEditDrawerVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Helper untuk cek role
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';

  // ============================================
  // FUNGSI FETCH DATA
  // ============================================

  const fetchBook = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const fetchedBook = await getBookById(bookId);

      if (!fetchedBook) {
        Alert.alert('Error', 'Buku tidak ditemukan.');
        navigation.goBack();
        return;
      }

      setBook(fetchedBook);

      if (isMember && user?.uid) {
        const borrowed = await hasUserBorrowedBook(user.uid, bookId);
        setHasBorrowed(borrowed);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengambil detail buku.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [bookId, isMember, user?.uid, navigation]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  const handleBorrow = async (): Promise<void> => {
    if (!book || !user) return;

    if (book.status === 'BORROWED') {
      Alert.alert('Tidak Tersedia', 'Buku ini sedang dipinjam.');
      return;
    }

    if (hasBorrowed) {
      Alert.alert('Sudah Dipinjam', 'Anda sudah meminjam buku ini.');
      return;
    }

    Alert.alert(
      'Konfirmasi Peminjaman',
      `Apakah Anda ingin meminjam "${book.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Pinjam',
          onPress: async () => {
            try {
              setIsBorrowing(true);
              await borrowBook(bookId, user);

              setBook((prev) =>
                prev
                  ? {
                    ...prev,
                    status: 'BORROWED',
                  }
                  : null
              );

              setHasBorrowed(true);
              Alert.alert('Sukses', 'Buku berhasil dipinjam!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal meminjam buku.');
            } finally {
              setIsBorrowing(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async (data: { title: string; author: string; description: string }): Promise<void> => {
    if (!book) return;

    try {
      setIsSaving(true);

      await updateBook(bookId, {
        title: data.title,
        author: data.author,
        description: data.description || undefined,
      });

      setBook((prev) =>
        prev
          ? {
            ...prev,
            title: data.title,
            author: data.author,
            description: data.description || undefined,
          }
          : null
      );

      setIsEditDrawerVisible(false);
      Alert.alert('Sukses', 'Buku berhasil diupdate!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengupdate buku.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBook = (): void => {
    if (!book) return;

    Alert.alert(
      'Hapus Buku',
      `Apakah Anda yakin ingin menghapus "${book.title}"?\n\nAksi ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteBook(bookId);
              Alert.alert('Sukses', 'Buku berhasil dihapus.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal menghapus buku.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (): Promise<void> => {
    if (!book) return;

    const newStatus = book.status === 'AVAILABLE' ? 'BORROWED' : 'AVAILABLE';

    try {
      setIsTogglingStatus(true);
      await updateBook(bookId, { status: newStatus });

      setBook((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengubah status buku.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isAdmin ? '#2196F3' : '#4CAF50'} />
        <Text style={styles.loadingText}>Memuat detail buku...</Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>Buku tidak ditemukan</Text>
      </View>
    );
  }

  const isAvailable = book.status === 'AVAILABLE';
  const primaryColor = isAdmin ? '#2196F3' : '#4CAF50';

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ===== SECTION: GAMBAR SAMPUL ===== */}
        <View style={styles.coverSection}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.placeholderCover}>
              <Ionicons name="book" size={80} color="#ccc" />
            </View>
          )}
        </View>

        {/* ===== SECTION: INFORMASI BUKU ===== */}
        <View style={styles.infoSection}>
          {/* Judul Buku */}
          <Text style={styles.title}>{book.title}</Text>

          {/* Nama Penulis */}
          <Text style={styles.author}>oleh {book.author}</Text>

          {/* Badge Status Ketersediaan */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                isAvailable ? styles.availableBadge : styles.unavailableBadge,
              ]}
            >
              <Ionicons
                name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={isAvailable ? '#4CAF50' : '#F44336'}
              />
              <Text
                style={[
                  styles.statusText,
                  isAvailable ? styles.availableText : styles.unavailableText,
                ]}
              >
                {isAvailable ? 'Tersedia' : 'Dipinjam'}
              </Text>
            </View>
          </View>

          {/* Toggle Status (Admin only) */}
          {isAdmin && (
            <View style={styles.toggleStatusContainer}>
              <View style={styles.toggleStatusInfo}>
                <Text style={styles.toggleStatusLabel}>Status Buku</Text>
                <Text style={styles.toggleStatusValue}>
                  {isAvailable ? 'Tersedia (dapat dipinjam)' : 'Dipinjam (tidak tersedia)'}
                </Text>
              </View>
              {isTogglingStatus ? (
                <ActivityIndicator size="small" color={primaryColor} />
              ) : (
                <Switch
                  value={isAvailable}
                  onValueChange={handleToggleStatus}
                  trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                  thumbColor={isAvailable ? '#4CAF50' : '#BDBDBD'}
                  ios_backgroundColor="#E0E0E0"
                />
              )}
            </View>
          )}

          {/* Deskripsi (jika ada) */}
          {book.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Deskripsi</Text>
              <Text style={styles.description}>{book.description}</Text>
            </View>
          )}

          {/* ISBN (jika ada) */}
          {book.isbn && (
            <View style={styles.isbnContainer}>
              <Text style={styles.isbnLabel}>ISBN:</Text>
              <Text style={styles.isbnValue}>{book.isbn}</Text>
            </View>
          )}
        </View>

        {/* ===== SECTION: TOMBOL AKSI ===== */}
        <View style={styles.actionSection}>
          {isAdmin ? (
            // Admin Actions
            <View style={styles.adminActions}>
              {/* Tombol Edit */}
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton, { backgroundColor: primaryColor }]}
                onPress={() => setIsEditDrawerVisible(true)}
                disabled={isDeleting}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Edit Buku</Text>
              </TouchableOpacity>

              {/* Tombol Hapus */}
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton, isDeleting && styles.disabledButton]}
                onPress={handleDeleteBook}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Hapus</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Member Actions
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: primaryColor },
                (!isAvailable || hasBorrowed || isBorrowing) && styles.disabledButton,
              ]}
              onPress={handleBorrow}
              disabled={!isAvailable || hasBorrowed || isBorrowing}
            >
              {isBorrowing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={hasBorrowed ? 'checkmark-circle' : 'book-outline'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.actionButtonText}>
                    {hasBorrowed
                      ? 'Sudah Dipinjam'
                      : isAvailable
                        ? 'Pinjam Buku Ini'
                        : 'Stok Habis'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit Book Drawer Modal */}
      {book && (
        <EditBookDrawer
          visible={isEditDrawerVisible}
          onClose={() => setIsEditDrawerVisible(false)}
          book={book}
          onSave={handleSaveEdit}
          isSaving={isSaving}
        />
      )}
    </>
  );
};

// ============================================
// DRAWER STYLES
// ============================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const drawerStyles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    flexGrow: 0,
  },
  formContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  inputGroup: {
    marginBottom: 20,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

// ============================================
// MAIN STYLES
// ============================================

const styles = StyleSheet.create({
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

  // Error screen
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    color: '#666',
  },

  // Section gambar sampul
  coverSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  coverImage: {
    width: 200,
    height: 280,
    borderRadius: 12,
    resizeMode: 'cover',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  placeholderCover: {
    width: 200,
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section informasi buku
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  author: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },

  // Status ketersediaan
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  availableBadge: {
    backgroundColor: '#E8F5E9',
  },
  unavailableBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  availableText: {
    color: '#4CAF50',
  },
  unavailableText: {
    color: '#F44336',
  },

  // Toggle status (Admin)
  toggleStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  toggleStatusInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  toggleStatusValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Deskripsi buku
  descriptionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },

  // ISBN
  isbnContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  isbnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  isbnValue: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },

  // Section tombol aksi
  actionSection: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },

  // Admin actions
  adminActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 2,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#F44336',
  },
});

export default BookDetailScreen;

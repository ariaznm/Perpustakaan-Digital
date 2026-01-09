

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import hook autentikasi untuk akses data user dan fungsi logout
import { useAuth } from '../context/AuthContext';

// ============================================
// KOMPONEN EDIT PROFILE DRAWER
// ============================================

interface EditProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  primaryColor: string;
}

const EditProfileDrawer: React.FC<EditProfileDrawerProps> = ({
  visible,
  onClose,
  currentName,
  primaryColor,
}) => {
  const { updateProfile } = useAuth();
  const [name, setName] = useState<string>(currentName);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Reset form saat drawer dibuka
  useEffect(() => {
    if (visible) {
      setName(currentName);
      setIsSaving(false);
    }
  }, [visible, currentName]);

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

  const handleSave = async (): Promise<void> => {
    Keyboard.dismiss();

    // Validasi
    if (!name.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong.');
      return;
    }

    if (name.trim() === currentName) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(name.trim());
      Alert.alert('Sukses', 'Profil berhasil diperbarui!', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memperbarui profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      Keyboard.dismiss();
      setName(currentName);
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
              <Text style={drawerStyles.headerTitle}>Edit Profil</Text>
              <TouchableOpacity onPress={handleClose} disabled={isSaving}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={drawerStyles.formContainer}>
              {/* Input Nama */}
              <View style={drawerStyles.inputGroup}>
                <Text style={drawerStyles.label}>Nama Lengkap</Text>
                <TextInput
                  style={[drawerStyles.input, { borderColor: primaryColor }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#999"
                  editable={!isSaving}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
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
                  style={[
                    drawerStyles.saveButton,
                    { backgroundColor: primaryColor },
                    isSaving && drawerStyles.saveButtonDisabled,
                  ]}
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
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// KOMPONEN PROFILE SCREEN
// ============================================

const ProfileScreen: React.FC = () => {
  // ============================================
  // HOOKS & STATE
  // ============================================

  // Ambil data user, fungsi logout, dan status loading dari Auth Context
  const { user, logout, isLoading } = useAuth();

  // State untuk drawer edit profil
  const [isEditDrawerVisible, setIsEditDrawerVisible] = useState<boolean>(false);

  // Helper untuk cek role user
  const isAdmin = user?.role === 'admin';

  // Warna tema berdasarkan role (biru untuk Admin, hijau untuk Member)
  const primaryColor = isAdmin ? '#2196F3' : '#4CAF50';

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  /**
   * Handler untuk logout
   * Menampilkan dialog konfirmasi sebelum logout
   */
  const handleLogout = (): void => {
    // Tampilkan dialog konfirmasi
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        // Tombol Batal
        { text: 'Batal', style: 'cancel' },
        // Tombol Logout
        {
          text: 'Keluar',
          style: 'destructive',  // Warna merah di iOS
          onPress: async () => {
            try {
              // Panggil fungsi logout dari Auth Context
              await logout();
              // Setelah logout, navigasi akan otomatis ke Login Screen
              // (dihandle oleh AppNavigator)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal logout.');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ===== HEADER PROFIL ===== */}
        {/* Warna background berdasarkan role */}
        <View style={[styles.header, { backgroundColor: primaryColor }]}>
          {/* ----- Avatar ----- */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {/* Icon berbeda untuk Admin dan Member */}
              <Ionicons
                name={isAdmin ? 'shield' : 'person'}
                size={50}
                color={primaryColor}
              />
            </View>
          </View>

          {/* ----- Nama User ----- */}
          <Text style={styles.userName}>{user?.name || 'User'}</Text>

          {/* ----- Email User ----- */}
          <Text style={styles.userEmail}>{user?.email || ''}</Text>

          {/* ----- Badge Role (Hanya untuk Admin) ----- */}
          {isAdmin && (
            <View style={styles.roleBadge}>
              {/* Icon role */}
              <Ionicons
                name="shield-checkmark"
                size={14}
                color="#fff"
              />
              {/* Teks role */}
              <Text style={styles.roleText}>Administrator</Text>
            </View>
          )}
        </View>

        {/* ===== SECTION: INFORMASI AKUN ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Akun</Text>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: primaryColor + '15' }]}
              onPress={() => setIsEditDrawerVisible(true)}
            >
              <Ionicons name="pencil" size={16} color={primaryColor} />
              <Text style={[styles.editButtonText, { color: primaryColor }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            {/* ----- Baris Nama Lengkap ----- */}
            <View style={styles.infoRow}>
              {/* Icon dalam lingkaran */}
              <View style={styles.infoIconContainer}>
                <Ionicons name="person-outline" size={20} color={primaryColor} />
              </View>
              {/* Konten info */}
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nama Lengkap</Text>
                <Text style={styles.infoValue}>{user?.name || 'N/A'}</Text>
              </View>
            </View>

            {/* Garis pemisah */}
            <View style={styles.divider} />

            {/* ----- Baris Email ----- */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="mail-outline" size={20} color={primaryColor} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
              </View>
            </View>

            {/* ----- Baris Tipe Akun (Hanya untuk Admin) ----- */}
            {isAdmin && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons
                      name="shield-outline"
                      size={20}
                      color={primaryColor}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Tipe Akun</Text>
                    <Text style={styles.infoValue}>Administrator</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ===== SECTION: TOMBOL LOGOUT ===== */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}  // Disable saat loading
          >
            {/* Icon logout */}
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
            {/* Teks logout */}
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer at bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== EDIT PROFILE DRAWER ===== */}
      <EditProfileDrawer
        visible={isEditDrawerVisible}
        onClose={() => setIsEditDrawerVisible(false)}
        currentName={user?.name || ''}
        primaryColor={primaryColor}
      />
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    paddingHorizontal: 20,
    paddingTop: 20,
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
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
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
  // Container utama
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Header profil
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },

  // Avatar container
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  // Nama dan email user
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },

  // Badge role
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Section container
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Edit button
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Card informasi
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Baris informasi
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },

  // Garis pemisah
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },

  // Tombol logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});

export default ProfileScreen;

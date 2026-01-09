import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import hook autentikasi
import { useAuth } from '../../context/AuthContext';

// ============================================
// KOMPONEN LOGIN SCREEN
// ============================================

const LoginScreen: React.FC = () => {
  // ============================================
  // HOOKS & STATE
  // ============================================

  // Ambil fungsi login dan register dari Auth Context
  const { login, register, isLoading } = useAuth();

  // State untuk mode form (login atau register)
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);

  // State untuk input form
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');  // Hanya untuk register

  // State untuk toggle tampilkan password
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // State untuk error snackbar
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  const errorAnimation = useRef(new Animated.Value(0)).current;

  // Effect untuk animasi snackbar
  useEffect(() => {
    if (showError) {
      // Animate in
      Animated.timing(errorAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideError();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showError]);

  // Fungsi untuk menampilkan error
  const showErrorSnackbar = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
  };

  // Fungsi untuk menyembunyikan error
  const hideError = () => {
    Animated.timing(errorAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowError(false);
      setErrorMessage('');
    });
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  /**
   * Handler untuk submit form (Login atau Register)
   */
  const handleSubmit = async (): Promise<void> => {
    // ===== VALIDASI INPUT =====

    // Cek email tidak kosong
    if (!email.trim()) {
      Alert.alert('Error', 'Silakan masukkan alamat email.');
      return;
    }

    // Cek password tidak kosong
    if (!password.trim()) {
      Alert.alert('Error', 'Silakan masukkan password.');
      return;
    }

    // Cek nama tidak kosong (hanya untuk register)
    if (!isLoginMode && !name.trim()) {
      Alert.alert('Error', 'Silakan masukkan nama lengkap.');
      return;
    }

    // ===== PROSES LOGIN/REGISTER =====
    try {
      if (isLoginMode) {
        // Mode Login
        await login(email.trim(), password);
        // Jika berhasil, navigasi otomatis ke Main (dihandle oleh AppNavigator)
      } else {
        // Mode Register - Selalu daftar sebagai member (anggota perpustakaan)
        await register(email.trim(), password, name.trim(), 'member');
        // Jika berhasil, navigasi otomatis ke Main
      }
    } catch (error: any) {
      // Tampilkan pesan error yang user-friendly
      if (isLoginMode) {
        // Untuk login, tampilkan pesan sederhana tanpa detail Firebase
        showErrorSnackbar('Email atau password salah');
      } else {
        // Untuk register, tampilkan pesan yang lebih spesifik
        if (error.code === 'auth/email-already-in-use' || error.message?.includes('sudah terdaftar')) {
          showErrorSnackbar('Email sudah terdaftar');
        } else if (error.code === 'auth/weak-password' || error.message?.includes('lemah')) {
          showErrorSnackbar('Password minimal 6 karakter');
        } else if (error.code === 'auth/invalid-email' || error.message?.includes('tidak valid')) {
          showErrorSnackbar('Format email tidak valid');
        } else {
          showErrorSnackbar('Gagal mendaftar. Silakan coba lagi.');
        }
      }
    }
  };

  /**
   * Handler untuk toggle mode Login/Register
   */
  const toggleMode = (): void => {
    setIsLoginMode(!isLoginMode);
    // Reset semua input saat ganti mode
    setEmail('');
    setPassword('');
    setName('');
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    // KeyboardAvoidingView agar form tidak tertutup keyboard
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ===== ERROR SNACKBAR ===== */}
      {showError && (
        <Animated.View
          style={[
            styles.snackbar,
            {
              opacity: errorAnimation,
              transform: [
                {
                  translateY: errorAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <Text style={styles.snackbarText}>{errorMessage}</Text>
          <TouchableOpacity onPress={hideError} style={styles.snackbarClose}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"  // Agar bisa tap tombol saat keyboard terbuka
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          {/* Logo/Icon */}
          <Ionicons name="library" size={80} color="#2196F3" />

          {/* Judul Aplikasi */}
          <Text style={styles.title}>Perpustakaan Digital</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {isLoginMode ? 'Masuk ke akun Anda' : 'Daftar sebagai anggota perpustakaan'}
          </Text>
        </View>

        {/* ===== FORM ===== */}
        <View style={styles.form}>

          {/* ----- Input Nama (Hanya untuk Register) ----- */}
          {!isLoginMode && (
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nama"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"  // Kapital di awal setiap kata
                editable={!isLoading}   // Disable saat loading
              />
            </View>
          )}

          {/* ----- Input Email ----- */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"  // Keyboard khusus email
              autoCapitalize="none"         // Tidak auto kapital
              autoCorrect={false}           // Tidak auto correct
              editable={!isLoading}
            />
          </View>

          {/* ----- Input Password ----- */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}  // Sembunyikan karakter jika showPassword false
              autoCapitalize="none"
              editable={!isLoading}
            />
            {/* Tombol toggle tampilkan password */}
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* ----- Tombol Submit ----- */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              // Tampilkan loading indicator saat proses
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLoginMode ? 'Masuk' : 'Daftar'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ----- Tombol Toggle Mode ----- */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleMode}
            disabled={isLoading}
          >
            <Text style={styles.toggleButtonText}>
              {isLoginMode
                ? 'Belum punya akun? Daftar di sini'
                : 'Sudah punya akun? Masuk di sini'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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

  // Konten scroll
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  // Header (logo dan judul)
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },

  // Form container
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    // Shadow untuk iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow untuk Android
    elevation: 4,
  },

  // Input container (wrapper untuk icon + input)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },

  // Register info
  registerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  registerInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
  },

  // Submit button
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#90CAF9',  // Warna lebih terang saat disabled
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Toggle button (link untuk ganti mode)
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },

  // Error Snackbar
  snackbar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
  },
  snackbarText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  snackbarClose: {
    padding: 4,
  },
});

export default LoginScreen;

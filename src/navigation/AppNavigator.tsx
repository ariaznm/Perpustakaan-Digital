import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Import komponen navigasi
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import icon
import { Ionicons } from '@expo/vector-icons';

// Import hook autentikasi
import { useAuth } from '../context/AuthContext';

// Import tipe navigasi
import {
  RootStackParamList,
  AdminTabParamList,
  MemberTabParamList,
} from '../types';

// ============================================
// IMPORT LAYAR-LAYAR
// ============================================

// Layar Autentikasi
import LoginScreen from '../screens/auth/LoginScreen';

// Layar Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminBooksScreen from '../screens/admin/AdminBooksScreen';
import AdminMembersScreen from '../screens/admin/AdminMembersScreen';
import ReturnBookScreen from '../screens/admin/ReturnBookScreen';

// Layar Member (Anggota Perpustakaan)
import BookListScreen from '../screens/member/BookListScreen';
import MyHistoryScreen from '../screens/member/MyHistoryScreen';

// Layar Bersama (dipakai Admin dan Member)
import BookDetailScreen from '../screens/BookDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ============================================
// MEMBUAT INSTANCE NAVIGATOR
// ============================================

// Stack Navigator untuk navigasi utama (Login -> Main)
const RootStack = createStackNavigator<RootStackParamList>();

// Tab Navigator untuk Admin (4 tab)
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

// Tab Navigator untuk Member (3 tab)
const MemberTab = createBottomTabNavigator<MemberTabParamList>();

// Stack Navigator untuk nested navigation di dalam tab
const AdminStack = createStackNavigator();
const MemberStack = createStackNavigator();

// ============================================
// ADMIN BOOKS STACK
// Stack Navigator di dalam Tab "Books" untuk Admin
// Memungkinkan navigasi: Daftar Buku -> Detail Buku
// ============================================

const AdminBooksStack: React.FC = () => {
  return (
    <AdminStack.Navigator
      screenOptions={{
        // Style header (bagian atas layar)
        headerStyle: {
          backgroundColor: '#2196F3',  // Warna biru untuk Admin
        },
        headerTintColor: '#fff',  // Warna teks header putih
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Layar Daftar Buku */}
      <AdminStack.Screen
        name="AdminBooksList"
        component={AdminBooksScreen}
        options={{ title: 'Semua Buku' }}
      />
      {/* Layar Detail Buku */}
      <AdminStack.Screen
        name="BookDetail"
        component={BookDetailScreen}
        options={{ title: 'Detail Buku' }}
      />
    </AdminStack.Navigator>
  );
};

// ============================================
// ADMIN TAB NAVIGATOR
// Tab Navigator untuk Admin dengan 4 tab
// ============================================

const AdminTabNavigator: React.FC = () => {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        // Fungsi untuk menentukan icon setiap tab
        tabBarIcon: ({ focused, color, size }) => {
          // Default icon
          let iconName: keyof typeof Ionicons.glyphMap = 'book';

          // Tentukan icon berdasarkan nama route
          if (route.name === 'AdminDashboard') {
            // Tab Dashboard: icon grid/home
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'AdminBooks') {
            // Tab Buku: icon library
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'AdminMembers') {
            // Tab Anggota: icon people
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'ReturnBook') {
            // Tab Pengembalian: icon return
            iconName = focused ? 'return-down-back' : 'return-down-back-outline';
          } else if (route.name === 'AdminProfile') {
            // Tab Profil: icon person
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        // Warna tab aktif dan tidak aktif
        tabBarActiveTintColor: '#2196F3',  // Biru saat aktif
        tabBarInactiveTintColor: 'gray',   // Abu-abu saat tidak aktif
        // Style header
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      {/* Tab 1: Dashboard */}
      <AdminTab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      {/* Tab 2: Daftar Buku */}
      <AdminTab.Screen
        name="AdminBooks"
        component={AdminBooksStack}  // Menggunakan Stack Navigator
        options={{
          title: 'Buku',
          headerShown: false,  // Sembunyikan header karena sudah ada di Stack
        }}
      />
      {/* Tab 3: Daftar Anggota */}
      <AdminTab.Screen
        name="AdminMembers"
        component={AdminMembersScreen}
        options={{ title: 'Anggota' }}
      />
      {/* Tab 4: Pengembalian */}
      <AdminTab.Screen
        name="ReturnBook"
        component={ReturnBookScreen}
        options={{ title: 'Kembali' }}
      />
      {/* Tab 5: Profil */}
      <AdminTab.Screen
        name="AdminProfile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </AdminTab.Navigator>
  );
};

// ============================================
// MEMBER BOOKS STACK
// Stack Navigator di dalam Tab "Library" untuk Member (Anggota)
// ============================================

const MemberBooksStack: React.FC = () => {
  return (
    <MemberStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',  // Warna hijau untuk Member
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Layar Daftar Buku */}
      <MemberStack.Screen
        name="MemberBooksList"
        component={BookListScreen}
        options={{ title: 'Perpustakaan' }}
      />
      {/* Layar Detail Buku */}
      <MemberStack.Screen
        name="BookDetail"
        component={BookDetailScreen}
        options={{ title: 'Detail Buku' }}
      />
    </MemberStack.Navigator>
  );
};

// ============================================
// MEMBER TAB NAVIGATOR
// Tab Navigator untuk Member (Anggota) dengan 3 tab
// ============================================

const MemberTabNavigator: React.FC = () => {
  return (
    <MemberTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'book';

          if (route.name === 'BookList') {
            // Tab Perpustakaan: icon library
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'MyHistory') {
            // Tab Riwayat: icon time
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'MemberProfile') {
            // Tab Profil: icon person
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',  // Hijau saat aktif
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      {/* Tab 1: Perpustakaan */}
      <MemberTab.Screen
        name="BookList"
        component={MemberBooksStack}
        options={{
          title: 'Perpustakaan',
          headerShown: false,
        }}
      />
      {/* Tab 2: Riwayat Peminjaman */}
      <MemberTab.Screen
        name="MyHistory"
        component={MyHistoryScreen}
        options={{ title: 'Riwayat Saya' }}
      />
      {/* Tab 3: Profil */}
      <MemberTab.Screen
        name="MemberProfile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </MemberTab.Navigator>
  );
};

// ============================================
// LOADING SCREEN
// Ditampilkan saat mengecek status autentikasi
// ============================================

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
};

// ============================================
// APP NAVIGATOR (KOMPONEN UTAMA)
// Menentukan layar mana yang ditampilkan berdasarkan status login
// ============================================

const AppNavigator: React.FC = () => {
  // Ambil state autentikasi dari context
  const { user, isLoading, isAuthenticated } = useAuth();

  // Tampilkan loading screen saat mengecek status auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    // NavigationContainer adalah wrapper wajib untuk React Navigation
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // ===== BELUM LOGIN =====
          // Tampilkan layar Login
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              // Animasi saat berpindah dari Main ke Login (saat logout)
              animationTypeForReplace: 'pop',
            }}
          />
        ) : (
          // ===== SUDAH LOGIN =====
          // Tampilkan Tab Navigator sesuai role
          <RootStack.Screen name="Main">
            {() =>
              // Cek role user
              user?.role === 'admin' ? (
                // Jika Admin, tampilkan AdminTabNavigator
                <AdminTabNavigator />
              ) : (
                // Jika Member (Anggota), tampilkan MemberTabNavigator
                <MemberTabNavigator />
              )
            }
          </RootStack.Screen>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;

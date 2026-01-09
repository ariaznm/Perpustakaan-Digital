import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Import helper functions
import { getAllBooks, getBorrowedTransactions } from '../../utils/firestoreHelper';
import { Book } from '../../types';
import { useAuth } from '../../context/AuthContext';

// ============================================
// TIPE DATA
// ============================================

interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  activeBorrows: number;
}

// ============================================
// KOMPONEN STAT CARD
// ============================================

interface StatCardProps {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, backgroundColor, subtitle }) => (
  <View style={[styles.statCard, { backgroundColor }]}>
    <View style={styles.statIconContainer}>
      <Ionicons name={icon} size={28} color="rgba(255,255,255,0.9)" />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// ============================================
// KOMPONEN UTAMA
// ============================================

const AdminDashboardScreen: React.FC = () => {
  // State
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    availableBooks: 0,
    borrowedBooks: 0,
    activeBorrows: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Auth context
  const { user } = useAuth();

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchDashboardData = useCallback(async (showLoader: boolean = true): Promise<void> => {
    try {
      if (showLoader) setIsLoading(true);

      // Fetch books and transactions in parallel
      const [books, borrowedTransactions] = await Promise.all([
        getAllBooks(),
        getBorrowedTransactions(),
      ]);

      // Calculate statistics
      const totalBooks = books.length;
      const availableBooks = books.filter((b: Book) => b.status === 'AVAILABLE').length;
      const borrowedBooks = books.filter((b: Book) => b.status === 'BORROWED').length;
      const activeBorrows = borrowedTransactions.length;

      setStats({
        totalBooks,
        availableBooks,
        borrowedBooks,
        activeBorrows,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refresh saat layar difokuskan
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // Handler pull to refresh
  const handleRefresh = (): void => {
    setIsRefreshing(true);
    fetchDashboardData(false);
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#2196F3']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Welcome */}
      <View style={styles.headerSection}>
        <Text style={styles.greeting}>Selamat Datang,</Text>
        <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
        <Text style={styles.headerSubtitle}>
          Berikut ringkasan perpustakaan hari ini
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Buku"
          value={stats.totalBooks}
          icon="library"
          backgroundColor="#6366F1"
          subtitle="buku terdaftar"
        />
        <StatCard
          title="Tersedia"
          value={stats.availableBooks}
          icon="checkmark-circle"
          backgroundColor="#10B981"
          subtitle="dapat dipinjam"
        />
        <StatCard
          title="Dipinjam"
          value={stats.borrowedBooks}
          icon="bookmark"
          backgroundColor="#3B82F6"
          subtitle="sedang dipinjam"
        />
        <StatCard
          title="Transaksi Aktif"
          value={stats.activeBorrows}
          icon="time"
          backgroundColor="#EC4899"
          subtitle="peminjaman aktif"
        />
      </View>

      {/* Quick Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Informasi Cepat</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="book" size={20} color="#FF9800" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Buku Dipinjam</Text>
              <Text style={styles.infoValue}>{stats.borrowedBooks} buku</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Ketersediaan</Text>
              <Text style={styles.infoValue}>
                {stats.totalBooks > 0
                  ? Math.round((stats.availableBooks / stats.totalBooks) * 100)
                  : 0}% buku tersedia
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Loading
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

  // Header
  headerSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    marginHorizontal: '1.5%',
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    minHeight: 140,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Info Section
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },

  // Tips Section
  tipsSection: {
    marginBottom: 16,
  },
  tipCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
  },
});

export default AdminDashboardScreen;

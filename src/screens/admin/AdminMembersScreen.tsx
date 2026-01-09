import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Import helper dan types
import { getAllMembersWithBorrows, MemberWithBorrows } from '../../utils/firestoreHelper';
import { Transaction } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';

// ============================================
// KOMPONEN BORROWED BOOK ITEM
// ============================================

interface BorrowedBookItemProps {
  transaction: Transaction;
}

const BorrowedBookItem: React.FC<BorrowedBookItemProps> = ({ transaction }) => {
  // Format tanggal peminjaman
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.borrowedBookItem}>
      <Ionicons name="book" size={16} color="#2196F3" />
      <View style={styles.borrowedBookInfo}>
        <Text style={styles.borrowedBookTitle} numberOfLines={1}>
          {transaction.bookTitle}
        </Text>
        <Text style={styles.borrowedBookDate}>
          Dipinjam: {formatDate(transaction.borrowDate)}
        </Text>
      </View>
    </View>
  );
};

// ============================================
// KOMPONEN MEMBER CARD
// ============================================

interface MemberCardProps {
  member: MemberWithBorrows;
  isExpanded: boolean;
  onToggle: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, isExpanded, onToggle }) => {
  const { user, borrowedBooks } = member;
  const hasBorrowedBooks = borrowedBooks.length > 0;

  return (
    <View style={styles.memberCard}>
      {/* Header - Info Member */}
      <TouchableOpacity
        style={styles.memberHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{user.name}</Text>
          <Text style={styles.memberEmail}>{user.email}</Text>
          {hasBorrowedBooks && (
            <View style={styles.borrowBadge}>
              <Ionicons name="book" size={12} color="#fff" />
              <Text style={styles.borrowBadgeText}>
                {borrowedBooks.length} buku dipinjam
              </Text>
            </View>
          )}
        </View>

        {/* Expand Icon */}
        {hasBorrowedBooks && (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        )}
      </TouchableOpacity>

      {/* Expanded Content - Daftar Buku yang Dipinjam */}
      {isExpanded && hasBorrowedBooks && (
        <View style={styles.expandedContent}>
          <Text style={styles.borrowedBooksTitle}>Buku yang Dipinjam:</Text>
          {borrowedBooks.map((book) => (
            <BorrowedBookItem key={book.id} transaction={book} />
          ))}
        </View>
      )}

      {/* No Books Message */}
      {isExpanded && !hasBorrowedBooks && (
        <View style={styles.expandedContent}>
          <Text style={styles.noBooksText}>
            Tidak ada buku yang sedang dipinjam
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// KOMPONEN UTAMA
// ============================================

const AdminMembersScreen: React.FC = () => {
  // State
  const [members, setMembers] = useState<MemberWithBorrows[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Debounced search query - menunggu 500ms setelah user berhenti mengetik
  const debouncedQuery = useDebounce(searchQuery, 500);

  // Filtered members menggunakan useMemo dengan debouncedQuery
  const filteredMembers = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return members;
    }

    const lowerQuery = debouncedQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.user.name.toLowerCase().includes(lowerQuery) ||
        m.user.email.toLowerCase().includes(lowerQuery)
    );
  }, [debouncedQuery, members]);

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchMembers = useCallback(async (showLoader: boolean = true): Promise<void> => {
    try {
      if (showLoader) setIsLoading(true);

      const data = await getAllMembersWithBorrows();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refresh saat layar difokuskan
  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  // Handler pull to refresh
  const handleRefresh = (): void => {
    setIsRefreshing(true);
    fetchMembers(false);
  };

  // ============================================
  // SEARCH HANDLER
  // ============================================

  const handleSearch = (query: string): void => {
    setSearchQuery(query);
  };

  // ============================================
  // TOGGLE EXPAND
  // ============================================

  const toggleExpand = (memberId: string): void => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  // ============================================
  // RENDER
  // ============================================

  // Render member item
  const renderMemberItem = ({ item }: { item: MemberWithBorrows }) => (
    <MemberCard
      member={item}
      isExpanded={expandedMemberId === item.user.uid}
      onToggle={() => toggleExpand(item.user.uid)}
    />
  );

  // Render empty list
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Tidak Ditemukan' : 'Belum Ada Anggota'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `Tidak ada anggota dengan nama "${searchQuery}"`
          : 'Belum ada anggota yang terdaftar'}
      </Text>
    </View>
  );

  // Render header with search and stats
  const renderHeader = () => {
    const totalMembers = filteredMembers.length;
    const membersWithBorrows = filteredMembers.filter((m) => m.borrowedBooks.length > 0).length;

    return (
      <View style={styles.headerContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau email anggota..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalMembers}</Text>
            <Text style={styles.statLabel}>Total Anggota</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>{membersWithBorrows}</Text>
            <Text style={styles.statLabel}>Sedang Meminjam</Text>
          </View>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Memuat data anggota...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMembers}
        renderItem={renderMemberItem}
        keyExtractor={(item) => item.user.uid}
        contentContainerStyle={styles.listContent}
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
    </View>
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
  listContent: {
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
    fontSize: 14,
    color: '#666',
  },

  // Header
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },

  // Member Card
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  borrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  borrowBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },

  // Expanded Content
  expandedContent: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  borrowedBooksTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  borrowedBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  borrowedBookInfo: {
    flex: 1,
  },
  borrowedBookTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  borrowedBookDate: {
    fontSize: 12,
    color: '#999',
  },
  noBooksText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default AdminMembersScreen;


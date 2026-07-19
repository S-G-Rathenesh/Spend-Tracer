import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { TransactionCard, EmptyStateCard } from '../components';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

type RootStackParamList = {
  Transactions: undefined;
  AddTransaction: { transactionId?: string } | undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Transactions'>;

export const TransactionsScreen = () => {
  const { transactions, isLoading, fetchTransactions } = useTransactionStore();
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All'|'Income'|'Expense'>('All');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    fetchTransactions({ searchQuery: text });
  };

  const handleTransactionPress = (tx: any) => {
    navigation.navigate('AddTransaction', { transactionId: tx.id });
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'Income' && t.type !== 'Credit') return false;
    if (filter === 'Expense' && t.type !== 'Debit') return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by merchant, bank or notes..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {['All', 'Expense', 'Income'].map((f) => (
          <TouchableOpacity 
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f as any)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList 
        data={filteredTransactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TransactionCard transaction={item} onPress={handleTransactionPress} />
        )}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={() => fetchTransactions({ searchQuery })}
        ListEmptyComponent={() => (
          <EmptyStateCard 
            emoji="🧾"
            title="No transactions found"
            subtitle={searchQuery ? "Try a different search term" : "Your transaction history is empty."}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    height: 48,
    ...typography.body,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  filterText: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.accentLight,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100, // Room for bottom tab
  }
});

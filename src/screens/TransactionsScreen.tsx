import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { TransactionCard, EmptyStateCard } from '../components';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, AppTheme } from '../theme/theme';

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

  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    fetchTransactions({ searchQuery: text });
  };

  const handleTransactionPress = (transaction: any) => {
    // Open the new details screen instead of the editor
    navigation.navigate('TransactionDetails', { transactionId: transaction.id });
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
        <Icon name="magnify" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by merchant, bank or notes..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={theme.colors.textMuted} />
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
        renderItem={({ item, index }) => (
          <TransactionCard transaction={item} onPress={handleTransactionPress} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={() => fetchTransactions({ searchQuery })}
        ListEmptyComponent={() => (
          <EmptyStateCard 
            emoji={searchQuery ? "🔍🙈" : "🧾"}
            title="No transactions found"
            subtitle={searchQuery ? "Try a different search term" : "Your transaction history is empty."}
          />
        )}
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    height: 48,
    ...theme.typography.body,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    ...theme.typography.labelSm,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 100, // Room for bottom tab
  }
});

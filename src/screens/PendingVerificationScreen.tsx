import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { Transaction } from '../types/Transaction';
import { useAppTheme, AppTheme } from '../theme/theme';
import { EmptyStateCard, TransactionVerificationSheet } from '../components';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const PendingVerificationScreen = () => {
  const { pendingVerificationTransactions, fetchDashboardData } = useDashboardStore();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTransactionPress = (tx: Transaction) => {
    try {
      if (!tx || !tx.id) {
        alert('Unable to open this transaction.');
        return;
      }
      
      const safeTx = {
        ...tx,
        amount: tx.amount ?? 0,
        merchantId: tx.merchantId ?? 'Unknown Merchant',
        categoryId: tx.categoryId ?? 'Unknown',
        date: tx.date ?? new Date().toISOString().split('T')[0],
        type: tx.type ?? 'Debit'
      };
      
      setSelectedTx(safeTx);
      setSheetVisible(true);
    } catch (e) {
      console.error('Error opening transaction:', e);
      alert('Something went wrong while opening this transaction.');
    }
  };

  const getReason = (tx: Transaction) => {
    if (!tx.merchantId || tx.merchantId === 'Unknown Merchant') return 'Unknown Merchant';
    if (!tx.categoryId || tx.categoryId === 'Unknown' || tx.categoryId === 'Others') return 'Unknown Category';
    return 'Low Confidence';
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isDebit = item.type === 'Debit';
    const reason = getReason(item);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7} 
        onPress={() => handleTransactionPress(item)}
      >
        <View style={styles.cardLeft}>
          <View style={styles.iconContainer}>
            <Icon name="help-circle-outline" size={24} color={theme.colors.warning} />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.merchantText}>{item.merchantId || 'Unknown Merchant'}</Text>
            <Text style={styles.dateText}>{item.date}</Text>
            <View style={styles.reasonBadge}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.amountText, isDebit ? styles.debitText : styles.creditText]}>
            {isDebit ? '-' : '+'}₹{(item.amount ?? 0).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Pending Verification</Text>
      
      {pendingVerificationTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyStateCard
            emoji="✅"
            title="All caught up!"
            subtitle="No transactions currently require your review."
          />
        </View>
      ) : (
        <FlatList
          data={pendingVerificationTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TransactionVerificationSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        transaction={selectedTx}
        onVerified={() => fetchDashboardData()}
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardDetails: {
    flex: 1,
  },
  merchantText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  reasonBadge: {
    backgroundColor: theme.colors.warning + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reasonText: {
    fontSize: 10,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  debitText: {
    color: theme.colors.error,
  },
  creditText: {
    color: theme.colors.success,
  }
});

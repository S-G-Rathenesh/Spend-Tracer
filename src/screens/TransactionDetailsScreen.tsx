import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { useAppTheme, AppTheme } from '../theme/theme';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { Transaction } from '../types/Transaction';

type RootStackParamList = {
  Transactions: undefined;
  AddTransaction: { transactionId?: string };
  Dashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const TransactionDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { transactions, deleteTransaction } = useTransactionStore();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();

  const transactionId = route.params?.transactionId;
  const [transaction, setTransaction] = useState<any>(transactions.find(t => t.id === transactionId) || null);
  const [isLoading, setIsLoading] = useState(!transaction);

  useEffect(() => {
    if (!transaction && transactionId) {
      TransactionRepository.getById(transactionId).then(data => {
        setTransaction(data);
        setIsLoading(false);
      });
    }
  }, [transactionId, transaction]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Transaction not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = transaction.type === 'Credit';
  const color = isIncome ? theme.colors.income : theme.colors.expense;
  
  const handleDelete = () => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteTransaction(transaction.id);
          navigation.goBack();
      }}
    ]);
  };

  const handleEdit = () => {
    navigation.navigate('AddTransaction', { transactionId: transaction.id });
  };

  const isUnknownCategory = !transaction.categoryName || transaction.categoryName === 'Unknown' || transaction.categoryName === 'Others';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.actionBtn}>
            <Icon name="pencil" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
            <Icon name="delete" size={22} color={theme.colors.expense} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.typeBadge, { backgroundColor: isIncome ? theme.colors.incomeMuted : theme.colors.expenseMuted }]}>
            <Icon name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'} size={16} color={color} />
            <Text style={[styles.typeText, { color }]}>{isIncome ? 'Income' : 'Expense'}</Text>
          </View>
          <Text style={[styles.amountText, { color }]}>
            {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.merchantHeroText}>{transaction.merchantId || transaction.bank || 'Unknown'}</Text>
        </View>

        {isUnknownCategory && (
          <TouchableOpacity style={styles.warningBox} onPress={handleEdit}>
            <Icon name="alert-circle-outline" size={24} color={theme.colors.warning} />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Uncategorized</Text>
              <Text style={styles.warningSub}>Tap to categorize this transaction.</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Info Grid */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Category</Text>
              <View style={styles.categoryBadge}>
                {transaction.categoryIcon && (
                  <Icon name={transaction.categoryIcon} size={16} color={transaction.categoryColor || theme.colors.primary} style={styles.catIcon} />
                )}
                <Text style={styles.infoValue}>{transaction.categoryName || 'Unknown'}</Text>
              </View>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{transaction.date} • {transaction.time.substring(0, 5)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Payment Mode</Text>
              <Text style={styles.infoValue}>{transaction.transactionType || 'Unknown'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Bank / Source</Text>
              <Text style={styles.infoValue}>{transaction.bank || 'Unknown'}</Text>
            </View>
          </View>

          {transaction.referenceNumber && (
            <View style={styles.infoRow}>
              <View style={styles.infoColFull}>
                <Text style={styles.infoLabel}>Reference / UTR</Text>
                <Text style={styles.infoValue}>{transaction.referenceNumber}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        {(transaction.notes || transaction.source === 'manual') && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{transaction.notes || 'No notes attached.'}</Text>
          </View>
        )}

        {/* Original SMS */}
        {transaction.originalSms && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Original SMS</Text>
            <View style={styles.smsBox}>
              <Text style={styles.smsText}>{transaction.originalSms}</Text>
            </View>
            <Text style={styles.metadataText}>Source: {transaction.source.toUpperCase()}</Text>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h3,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: theme.spacing.md,
  },
  typeText: {
    ...theme.typography.labelSm,
    fontWeight: '600',
    marginLeft: 6,
  },
  amountText: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  merchantHeroText: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '15',
    borderWidth: 1,
    borderColor: theme.colors.warning + '50',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  warningTitle: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
  warningSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    ...theme.typography.h4,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  infoCol: {
    flex: 1,
  },
  infoColFull: {
    flex: 1,
  },
  infoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    ...theme.typography.body,
    fontWeight: '500',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIcon: {
    marginRight: 6,
  },
  notesText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  smsBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  smsText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  metadataText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'right',
  },
});

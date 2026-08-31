import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Transaction } from '../types/Transaction';
import { useAppTheme } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';

import { DeviceEventEmitter } from 'react-native';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { useDashboardStore } from '../hooks/useDashboardStore';

interface Props {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_CATEGORIES = [
  'Food', 'Shopping', 'Travel', 'Friend', 'Cashback', 'Investment', 'EMI', 'Bills', 
  'Groceries', 'Fuel', 'Healthcare', 'Entertainment', 'Transfer', 'Recharge', 
  'Subscription', 'Education', 'Insurance', 'Salary', 'ATM Withdrawal', 'Other'
];

export const CategoryVerificationModal: React.FC<Props> = ({ transaction, visible, onClose, onSuccess }) => {
  const theme = useAppTheme();
  const [customCategory, setCustomCategory] = useState('');

  if (!transaction) return null;

  const handleSelectCategory = async (category: string) => {
    try {
      // 1. Update Transaction
      const updatedTxn = { 
        ...transaction, 
        categoryId: category, 
        userCategory: category, 
        finalCategory: category, 
        aiConfidence: 1.0,
        needsVerification: false,
        updatedAt: new Date().toISOString()
      };
      await TransactionRepository.update(updatedTxn);

      // 2. Learn Mapping (Survives transaction deletion and SMS rebuild)
      const learned = await MerchantCategoryRepository.learnCorrection(
        transaction.merchantId,
        category,
        transaction.originalSms,
        transaction.smsHash,
        transaction.bank,
        transaction.bank
      );

      // 3. Auto-categorize all same-account / matching transactions
      await TransactionRepository.autoCategorizeMatchingTransactions({
        category,
        upiId: learned.upiId,
        accountIdentifier: learned.accountIdentifier,
        normalizedName: learned.normalizedName,
        merchantName: learned.merchantName,
        smsHash: learned.smsHash,
        excludeId: transaction.id
      });

      // 4. Refresh all stores & emit global update event
      await useDashboardStore.getState().fetchDashboardData();
      await useTransactionStore.getState().fetchTransactions();
      DeviceEventEmitter.emit('TransactionUpdated');

      onSuccess();
    } catch (error) {
      console.error('Failed to verify category', error);
    }
  };


  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Verify Transaction</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            We couldn't accurately identify this transaction. Please choose a category for:
          </Text>
          
          <View style={[styles.txnCard, { backgroundColor: theme.colors.background }]}>
            <Text style={{ color: theme.colors.textPrimary, fontWeight: 'bold' }}>{transaction.merchantId || transaction.notes}</Text>
            <Text style={{ color: transaction.type === 'Debit' ? theme.colors.error : theme.colors.success, fontWeight: 'bold' }}>
              {transaction.type === 'Debit' ? '-' : '+'}${transaction.amount}
            </Text>
          </View>

          <ScrollView style={styles.categoryList} contentContainerStyle={styles.categoryGrid}>
            {DEFAULT_CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.categoryChip, { backgroundColor: theme.colors.accentMuted }]}
                onPress={() => handleSelectCategory(cat)}
              >
                <Text style={{ color: theme.colors.accent }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.customInputRow}>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              placeholder="Or type a custom category..."
              placeholderTextColor={theme.colors.textSecondary}
              value={customCategory}
              onChangeText={setCustomCategory}
            />
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: theme.colors.accent, opacity: customCategory.trim() ? 1 : 0.5 }]}
              disabled={!customCategory.trim()}
              onPress={() => handleSelectCategory(customCategory.trim())}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  txnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryList: {
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    marginRight: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  saveBtn: {
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 12,
  }
});

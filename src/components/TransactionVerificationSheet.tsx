import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { BottomSheet, Button } from '../components';
import { Transaction } from '../types/Transaction';
import { useAppTheme, AppTheme } from '../theme/theme';
import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { SettingsRepository } from '../repositories/SettingsRepository';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const QUICK_CATEGORIES = [
  'Food', 'Shopping', 'Travel', 'Bills', 'Fuel', 
  'Healthcare', 'Education', 'Entertainment', 'Salary', 
  'Investment', 'Transfer', 'Recharge', 'Subscription', 
  'ATM Withdrawal', 'Other', 'Custom'
];

interface TransactionVerificationSheetProps {
  visible: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onVerified: () => void;
}

export const TransactionVerificationSheet: React.FC<TransactionVerificationSheetProps> = ({
  visible,
  onClose,
  transaction,
  onVerified
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { fetchDashboardData } = useDashboardStore();

  const [merchantName, setMerchantName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setMerchantName(transaction.merchantId === 'Unknown Merchant' ? '' : transaction.merchantId || '');
      
      const cat = transaction.categoryId === 'Others' || transaction.categoryId === 'Unknown' ? '' : transaction.categoryId || '';
      if (QUICK_CATEGORIES.includes(cat)) {
        setSelectedCategory(cat);
        setCustomCategory('');
      } else if (cat) {
        setSelectedCategory('Custom');
        setCustomCategory(cat);
      } else {
        setSelectedCategory('');
        setCustomCategory('');
      }
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;
    setIsSaving(true);
    
    try {
      const finalMerchant = merchantName.trim() || 'Unknown Merchant';
      const finalCategory = selectedCategory === 'Custom' ? customCategory.trim() : selectedCategory;
      const validCategory = finalCategory || 'Others';

      // 1. Update the transaction
      const updatedTx = {
        ...transaction,
        merchantId: finalMerchant,
        categoryId: validCategory,
        userCategory: validCategory,
        finalCategory: validCategory,
        needsVerification: false,
        updatedAt: new Date().toISOString()
      };
      
      await TransactionRepository.update(updatedTx);

      // 2. Persist learned mapping independently (survives transaction deletion and SMS rebuild)
      await MerchantCategoryRepository.learnCorrection(
        finalMerchant,
        validCategory,
        transaction.originalSms,
        transaction.smsHash,
        transaction.bank
      );

      // 3. Update AI Metrics
      const prevCorrections = await SettingsRepository.get('ai_user_corrections') || '0';
      await SettingsRepository.set('ai_user_corrections', (parseInt(prevCorrections, 10) + 1).toString());

      // 4. Refresh Dashboard
      await fetchDashboardData();
      
      onVerified();
      onClose();
    } catch (error) {
      console.error('Failed to verify transaction', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!transaction) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} height="85%">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Transaction</Text>
          <Text style={styles.subtitle}>We couldn't fully understand this transaction. Please help us identify it.</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, transaction.type === 'Credit' ? styles.creditAmount : styles.debitAmount]}>
                {transaction.type === 'Credit' ? '+' : '-'}₹{transaction.amount}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{transaction.date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank / Type</Text>
              <Text style={styles.detailValue}>{transaction.bank || 'Unknown'} • {transaction.transactionType || 'Unknown'}</Text>
            </View>
            {transaction.originalSms && (
              <View style={[styles.detailRow, { flexDirection: 'column', marginTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }]}>
                <Text style={styles.detailLabel}>Original SMS</Text>
                <Text style={[styles.detailValue, { marginTop: 4, fontStyle: 'italic', color: theme.colors.textSecondary, lineHeight: 20 }]}>"{transaction.originalSms}"</Text>
              </View>
            )}
          </View>

          {/* Merchant Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Merchant Name</Text>
            <TextInput
              style={styles.input}
              value={merchantName}
              onChangeText={setMerchantName}
              placeholder="e.g. Amazon, Starbucks, John"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {/* Category Chips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipsContainer}>
              {QUICK_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {selectedCategory === 'Custom' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Enter custom category"
                placeholderTextColor={theme.colors.textSecondary}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Skip"
            onPress={handleSkip}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="Save"
            onPress={handleSave}
            variant="primary"
            style={styles.actionButton}
            disabled={isSaving || (selectedCategory === 'Custom' && !customCategory.trim())}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  creditAmount: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  debitAmount: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFF',
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  }
});

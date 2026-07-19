import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../types/Transaction';
import { CurrencyUtils } from '../utils/CurrencyUtils';
import { DateUtils } from '../utils/DateUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography, moderateScale } from '../theme/theme';

interface Props {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

export const TransactionCard: React.FC<Props> = ({ transaction, onPress }) => {
  const t = transaction as any;
  const isDebit = t.type === 'Debit';
  const amountColor = isDebit ? colors.expense : colors.income;
  const amountPrefix = isDebit ? '-' : '+';
  const bg = isDebit ? colors.expenseMuted : colors.incomeMuted;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress && onPress(transaction)}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: t.categoryColor ? `${t.categoryColor}20` : bg }]}>
        <Icon name={t.categoryIcon || 'cash'} size={24} color={t.categoryColor || amountColor} />
      </View>
      
      <View style={styles.detailsContainer}>
        <Text style={styles.merchantName} numberOfLines={1}>
          {t.merchantId || t.bank || 'Unknown'}
        </Text>
        <Text style={styles.categoryName}>
          {t.categoryName || 'Others'} • {DateUtils.formatDate(t.date)}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{CurrencyUtils.format(t.amount)}
        </Text>
        {t.source === 'sms' && (
          <View style={styles.badge}>
            <Icon name="message-text-outline" size={10} color={colors.textMuted} />
            <Text style={styles.badgeText}>SMS</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xs,
  },
  iconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  merchantName: {
    ...typography.bodyLg,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryName: {
    ...typography.caption,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    ...typography.bodyLg,
    fontWeight: '700',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.overline,
    marginLeft: 4,
  }
});

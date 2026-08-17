import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../types/Transaction';
import { CurrencyUtils } from '../utils/CurrencyUtils';
import { DateUtils } from '../utils/DateUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, AppTheme, moderateScale } from '../theme/theme';

import { AnimatedEmoji } from './AnimatedEmoji';

interface Props {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  index?: number;
}

export const TransactionCard: React.FC<Props> = ({ transaction, onPress, index = 0 }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const t = transaction as any;
  const isDebit = t.type === 'Debit';
  const amountColor = isDebit ? theme.colors.expense : theme.colors.income;
  const amountPrefix = isDebit ? '-' : '+';
  const bg = isDebit ? theme.colors.expenseMuted : theme.colors.incomeMuted;
  
  const emoji = isDebit ? '🧾' : '💰';
  const delay = index * 100; // stagger

  console.log(`[DATE_PIPELINE] 6. Value received by UI: ${t.date} for transaction ${t.id}`);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <AnimatedEmoji emoji={emoji} type="fade" delay={delay} size={14} style={{ marginRight: 4 }} />
          <Text style={[styles.amount, { color: amountColor, marginBottom: 0 }]}>
            {amountPrefix}{CurrencyUtils.format(t.amount)}
          </Text>
        </View>
        {t.sources && t.sources.length > 1 ? (
          <View style={styles.badge}>
            <Icon name="vector-link" size={10} color={theme.colors.textMuted} />
            <Text style={styles.badgeText}>{t.sources.map((s: string) => s === 'sms' ? 'SMS' : 'App').join(' + ')}</Text>
          </View>
        ) : (t.source === 'sms' || t.sources?.includes('sms')) ? (
          <View style={[styles.badge, { flexDirection: 'row', alignItems: 'center' }]}>
            <AnimatedEmoji emoji="📩" type="pulse" delay={delay + 300} size={10} style={{ marginRight: 2 }} />
            <Text style={styles.badgeText}>SMS</Text>
          </View>
        ) : (t.source === 'notification' || t.sources?.includes('notification')) ? (
          <View style={styles.badge}>
            <Icon name="bell-outline" size={10} color={theme.colors.textMuted} />
            <Text style={styles.badgeText}>App</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginVertical: theme.spacing.xs,
  },
  iconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  merchantName: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryName: {
    ...theme.typography.caption,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    ...theme.typography.bodyLg,
    fontWeight: '700',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    ...theme.typography.overline,
    marginLeft: 4,
  }
});

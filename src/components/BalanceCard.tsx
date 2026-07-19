import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography, shadows, rfs } from '../theme/theme';
import { CurrencyUtils } from '../utils/CurrencyUtils';

interface Props {
  balance: number;
  income: number;
  expense: number;
}

export const BalanceCard: React.FC<Props> = ({ balance, income, expense }) => {
  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>{CurrencyUtils.format(balance)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.metric}>
          <View style={styles.metricIconRow}>
            <View style={[styles.metricDot, { backgroundColor: colors.income }]} />
            <Text style={styles.metricLabel}>Income</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.income }]}>
            {CurrencyUtils.format(income)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.metric}>
          <View style={styles.metricIconRow}>
            <View style={[styles.metricDot, { backgroundColor: colors.expense }]} />
            <Text style={styles.metricLabel}>Expense</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.expense }]}>
            {CurrencyUtils.format(expense)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1033',
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    ...shadows.glow,
  },
  topSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  balanceLabel: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: rfs(34),
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.xl,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  metricLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.45)',
  },
  metricValue: {
    fontSize: rfs(18),
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, AppTheme, rfs } from '../theme/theme';
import { CurrencyUtils } from '../utils/CurrencyUtils';

import { AnimatedEmoji } from './AnimatedEmoji';

interface Props {
  balance: number;
  income: number;
  expense: number;
}

export const BalanceCard: React.FC<Props> = ({ balance, income, expense }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const showInfo = () => {
    Alert.alert(
      'Net Cash Flow',
      "Net Cash Flow = This month's Income - This month's Expense.\n\nThis is not your actual bank account balance.",
      [{ text: 'OK' }]
    );
  };

  let balanceColor = '#FFFFFF';
  let formattedBalance = CurrencyUtils.format(balance);
  let emoji = null;
  let emojiType = 'fade';
  
  if (balance > 0) {
    balanceColor = theme.colors.income;
    emoji = '📈';
    emojiType = 'drop'; // drop/slide in
    if (!formattedBalance.startsWith('+')) {
      formattedBalance = `+${formattedBalance}`;
    }
  } else if (balance < 0) {
    balanceColor = theme.colors.expense;
    emoji = '📉';
    emojiType = 'pulse'; // subtle pulse
  }

  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        <TouchableOpacity style={styles.titleRow} onPress={showInfo} activeOpacity={0.7}>
          <Text style={styles.balanceLabel}>Net Cash Flow</Text>
          <Icon name="information-outline" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.balanceAmount, { color: balanceColor }]}>{formattedBalance}</Text>
          {emoji && <AnimatedEmoji emoji={emoji} type={emojiType as any} size={24} style={{ marginLeft: 8 }} />}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.metric}>
          <View style={styles.metricIconRow}>
            <View style={[styles.metricDot, { backgroundColor: theme.colors.income }]} />
            <Text style={styles.metricLabel}>Income</Text>
          </View>
          <Text style={[styles.metricValue, { color: theme.colors.income }]}>
            {CurrencyUtils.format(income)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.metric}>
          <View style={styles.metricIconRow}>
            <View style={[styles.metricDot, { backgroundColor: theme.colors.expense }]} />
            <Text style={styles.metricLabel}>Expense</Text>
          </View>
          <Text style={[styles.metricValue, { color: theme.colors.expense }]}>
            {CurrencyUtils.format(expense)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.isDarkMode ? '#1C1033' : theme.colors.accent,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    ...theme.shadows.glow,
  },
  topSection: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  balanceLabel: {
    ...theme.typography.labelSm,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceAmount: {
    fontSize: rfs(34),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: theme.spacing.xl,
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
    marginBottom: theme.spacing.xs,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  metricValue: {
    fontSize: rfs(18),
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

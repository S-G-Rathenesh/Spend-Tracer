import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
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

  let balanceColor = theme.isDarkMode ? '#FFFFFF' : theme.colors.textPrimary;
  let formattedBalance = CurrencyUtils.format(balance);
  let emoji = null;
  let emojiType = 'fade';
  
  if (balance > 0) {
    balanceColor = theme.colors.income;
    emoji = '📈';
    emojiType = 'drop'; 
    if (!formattedBalance.startsWith('+')) {
      formattedBalance = `+${formattedBalance}`;
    }
  } else if (balance < 0) {
    balanceColor = theme.colors.expense;
    emoji = '📉';
    emojiType = 'pulse';
  }

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        {theme.isDarkMode && (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={15}
            reducedTransparencyFallbackColor="rgba(15, 15, 20, 0.9)"
          />
        )}
        <View style={styles.topSection}>
          <TouchableOpacity style={styles.titleRow} onPress={showInfo} activeOpacity={0.7}>
            <Text style={styles.balanceLabel}>Net Cash Flow</Text>
            <Icon name="information-outline" size={16} color={theme.isDarkMode ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary} style={{ marginLeft: 6 }} />
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
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  cardShadow: {
    borderRadius: theme.borderRadius.xxl,
    ...(theme.isDarkMode 
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 0 // NO elevation to avoid black artifacts on Android
        } 
      : theme.shadows.md),
  },
  card: {
    backgroundColor: theme.isDarkMode ? 'rgba(20, 15, 30, 0.75)' : theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border,
    overflow: 'hidden',
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
    color: theme.isDarkMode ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary,
  },
  balanceAmount: {
    fontSize: rfs(34),
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : theme.colors.border,
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
    color: theme.isDarkMode ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: rfs(18),
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : theme.colors.border,
  }
});

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppTheme, rfs } from '../../theme/theme';
import { CurrencyUtils } from '../../utils/CurrencyUtils';
import { AnimatedEmoji } from '../AnimatedEmoji';

interface Props {
  theme: AppTheme;
  totalIncome: number;
  totalExpense: number;
}

const CountUpNumber = ({ value, style }: { value: number, style: any }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const steps = 30;
    const stepTime = Math.abs(Math.floor(duration / steps));
    
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    const timer = setInterval(() => {
      start += value / steps;
      if (start >= value) {
        clearInterval(timer);
        setDisplayValue(value);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return <Text style={style}>{CurrencyUtils.format(displayValue)}</Text>;
};

export const FinancialSummary = ({ theme, totalIncome, totalExpense }: Props) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const netCashFlow = totalIncome - totalExpense;

  return (
    <View style={styles.container}>
      <View style={styles.topGrid}>
        <View style={styles.box}>
          <Text style={styles.label}>Expense</Text>
          <CountUpNumber value={totalExpense} style={styles.value} />
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Income</Text>
          <CountUpNumber value={totalIncome} style={styles.value} />
        </View>
      </View>

      <View style={styles.netFlowBox}>
        <View>
          <Text style={styles.label}>Net Cash Flow</Text>
          <View style={styles.netFlowRow}>
            <Text style={[styles.netValue, { color: netCashFlow >= 0 ? theme.colors.income : theme.colors.expense }]}>
              {netCashFlow > 0 ? '+' : ''}
              <CountUpNumber value={Math.abs(netCashFlow)} style={{}} />
            </Text>
            {netCashFlow !== 0 && (
              <AnimatedEmoji 
                emoji={netCashFlow > 0 ? "📈" : "⚠️"} 
                type="fade" 
                delay={600} 
                size={16} 
                style={{ marginLeft: 8 }} 
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  topGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  box: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  netFlowBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  netFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  netValue: {
    ...theme.typography.h3,
  }
});

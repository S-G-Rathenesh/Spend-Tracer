import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, withSpring } from 'react-native-reanimated';
import { AppTheme } from '../../theme/theme';
import { CurrencyUtils } from '../../utils/CurrencyUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AnimatedBar = ({ heightPercent, color, index, styles, label, amount }: any) => {
  const progress = useSharedValue(0);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(index * 40, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [heightPercent]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: `${progress.value * heightPercent}%`,
    };
  });

  return (
    <TouchableOpacity 
      style={styles.barColumn} 
      activeOpacity={0.8}
      onPress={() => setShowTooltip(!showTooltip)}
    >
      {showTooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{CurrencyUtils.format(amount)}</Text>
        </View>
      )}
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { backgroundColor: color }, animatedStyle]} />
      </View>
      <Text style={[styles.barLabel, color.length > 7 && { color: color.substring(0,7), fontWeight: '700' }]}>
        {label.substring(0, 3)}
      </Text>
    </TouchableOpacity>
  );
};

interface Props {
  data: { label: string, value: number }[];
  theme: AppTheme;
}

export const WeeklySpending = ({ data, theme }: Props) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  if (data.length === 0) return null;

  const maxWeekly = Math.max(...data.map(w => w.value), 0);
  const totalWeekly = data.reduce((sum, day) => sum + day.value, 0);

  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
  }, []);
  const animatedEmptyStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Weekly Spending</Text>
          <Text style={styles.cardSubtitle}>
            {CurrencyUtils.format(totalWeekly)} this week
          </Text>
        </View>
        <Icon name="calendar-week" size={20} color={theme.colors.textMuted} />
      </View>

      {totalWeekly === 0 ? (
        <Animated.View style={[styles.emptyState, animatedEmptyStyle]}>
          <Text style={styles.emptyTitle}>Nothing spent this week 🎉</Text>
          <Text style={styles.emptySub}>Your wallet is happy.</Text>
        </Animated.View>
      ) : (
        <View style={styles.barChartContainer}>
          {data.map((day, index) => {
            const heightPercent = (day.value / maxWeekly) * 100;
            const isHighest = day.value === maxWeekly && maxWeekly > 0;
            
            return (
              <AnimatedBar 
                key={index}
                heightPercent={heightPercent} 
                color={isHighest ? theme.colors.primary : theme.colors.primary + '66'} 
                index={index} 
                styles={styles} 
                label={day.label}
                amount={day.value}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120, // More compact
    marginTop: theme.spacing.md,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barBg: {
    height: 80,
    width: '50%',
    maxWidth: 24,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  barLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  tooltip: {
    position: 'absolute',
    top: -24,
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  tooltipText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textPrimary,
  },
  emptyState: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  }
});

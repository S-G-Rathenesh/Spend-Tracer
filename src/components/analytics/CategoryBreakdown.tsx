import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { AppTheme } from '../../theme/theme';
import { CurrencyUtils } from '../../utils/CurrencyUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DonutSlice = ({ center, radius, strokeWidth, stroke, angle, circumference, rotation, index }: any) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(index * 80, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [angle]);

  const animatedProps = useAnimatedProps(() => {
    const arcLength = (angle / 360) * circumference;
    const currentArc = progress.value * arcLength;
    return {
      strokeDasharray: `${currentArc} ${circumference}`
    };
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="transparent"
      animatedProps={animatedProps}
      strokeDashoffset={0}
      origin={`${center}, ${center}`}
      rotation={rotation}
      strokeLinecap="round"
    />
  );
};

const getCategoryEmoji = (name: string) => {
  const lower = name.toLowerCase().trim();
  if (lower.includes('food') || lower.includes('dining')) return '🍔';
  if (lower.includes('shop') || lower.includes('retail')) return '🛍️';
  if (lower.includes('transport') || lower.includes('travel') || lower.includes('taxi')) return '🚕';
  if (lower.includes('grocer')) return '🛒';
  if (lower.includes('health') || lower.includes('medical')) return '⚕️';
  if (lower.includes('utilit') || lower.includes('bill')) return '💡';
  if (lower.includes('entertainment') || lower.includes('movie')) return '🎬';
  if (lower.includes('uncategorized')) return '🏷️';
  return '💳';
};

interface Props {
  data: { label: string, value: number, color: string }[];
  theme: AppTheme;
  totalExpense: number;
}

export const CategoryBreakdown = ({ data, theme, totalExpense }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  if (data.length === 0) return null;

  const isOnlyUncategorized = data.length === 1 && data[0].label.trim().toLowerCase() === 'uncategorized';

  // Responsive sizes
  const cardPadding = theme.spacing.lg * 2;
  const containerPadding = theme.spacing.lg * 2;
  const availableWidth = screenWidth - containerPadding - cardPadding;
  
  // Donut size maxes out at 160, but scales down on very small screens
  const size = Math.min(160, availableWidth * 0.6); 
  const strokeWidth = Math.max(12, size * 0.12);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let currentAngle = -90;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Category Breakdown</Text>
        <Icon name="chart-arc" size={20} color={theme.colors.textMuted} />
      </View>

      {isOnlyUncategorized ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>🏷️ Categorize your transactions</Text>
          <Text style={styles.emptySub}>Assign categories to get better spending insights.</Text>
        </View>
      ) : (
        <View style={styles.contentColumn}>
          <View style={styles.donutWrapper}>
            <View style={[styles.donutContainer, { width: size, height: size }]}>
              <Svg width={size} height={size}>
                <G rotation="0" origin={`${center}, ${center}`}>
                  {totalExpense === 0 ? (
                    <Circle cx={center} cy={center} r={radius} stroke={theme.colors.surfaceLight} strokeWidth={strokeWidth} fill="transparent" />
                  ) : (
                    data.map((item, index) => {
                      const angle = (item.value / totalExpense) * 360;
                      const rotation = currentAngle;
                      currentAngle += angle;
                      return (
                        <DonutSlice
                          key={index}
                          index={index}
                          center={center}
                          radius={radius}
                          strokeWidth={strokeWidth}
                          stroke={item.color || theme.colors.primary}
                          angle={angle}
                          circumference={circumference}
                          rotation={rotation}
                        />
                      );
                    })
                  )}
                </G>
              </Svg>
              <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ ...theme.typography.h3, color: theme.colors.textPrimary, fontSize: Math.max(16, size * 0.18) }}>
                  {data.length}
                </Text>
                <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted, fontSize: Math.max(10, size * 0.08) }}>Total</Text>
              </View>
            </View>
          </View>

          <View style={styles.legendContainer}>
            {data.slice(0, 5).map((cat, index) => {
              const percentage = totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(0) : '0';
              return (
                <View key={index} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <Text style={styles.legendEmoji}>{getCategoryEmoji(cat.label)}</Text>
                    <Text style={styles.legendLabel} numberOfLines={1} ellipsizeMode="tail">
                      {cat.label.trim()}
                    </Text>
                  </View>
                  <View style={styles.legendRight}>
                    <Text style={styles.legendPercent}>{percentage}%</Text>
                    <Text style={styles.legendValue}>{CurrencyUtils.format(cat.value)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
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
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  contentColumn: {
    alignItems: 'center',
    width: '100%',
  },
  donutWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  legendEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  legendLabel: {
    ...theme.typography.bodySm,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 120,
  },
  legendPercent: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginRight: 12,
    width: 32,
    textAlign: 'right',
  },
  legendValue: {
    ...theme.typography.bodySm,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  }
});

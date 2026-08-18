import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { AppTheme } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  data: { label: string, value: number }[];
  theme: AppTheme;
}

export const ExpenseTrendChart = ({ data, theme }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Handle empty state gracefully
  const hasData = data.length > 1 && data.some(d => d.value > 0);

  // Total width of chart = screenWidth - card margins (lg*2) - card padding (lg*2)
  const chartWidth = screenWidth - (theme.spacing.lg * 4); 
  const height = 160;
  const paddingX = 16;
  const paddingY = 24;

  const max = Math.max(...data.map(d => d.value), 1);
  const stepX = data.length > 1 ? (chartWidth - paddingX * 2) / (data.length - 1) : 0;
  
  let pathData = '';
  let areaData = '';
  
  if (hasData) {
    data.forEach((d, i) => {
      const x = paddingX + i * stepX;
      const y = height - paddingY - (d.value / max) * (height - paddingY * 2);
      if (i === 0) {
        pathData += `M ${x} ${y} `;
        areaData += `M ${x} ${height} L ${x} ${y} `;
      } else {
        pathData += `L ${x} ${y} `;
        areaData += `L ${x} ${y} `;
      }
      if (i === data.length - 1) {
        areaData += `L ${x} ${height} Z`;
      }
    });
  }

  const progress = useSharedValue(0);
  const pathLength = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) });
  }, [data]);

  const animatedProps = useAnimatedProps(() => {
    const length = pathLength.value || 2000;
    return {
      strokeDasharray: length,
      strokeDashoffset: length - length * progress.value,
    };
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Expense Trend</Text>
        <Icon name="chart-line-variant" size={20} color={theme.colors.textMuted} />
      </View>
      
      {!hasData ? (
        <View style={styles.emptyState}>
          <Icon name="chart-line-stacked" size={32} color={theme.colors.surfaceLight} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>No spending data for this period</Text>
        </View>
      ) : (
        <View style={{ width: chartWidth, height, marginTop: theme.spacing.sm }}>
          <Svg width={chartWidth} height={height}>
            <Defs>
              <LinearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.3" />
                <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>
            <Path d={areaData} fill="url(#trendGrad)" />
            
            <AnimatedPath
              d={pathData}
              stroke={theme.colors.primary}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              ref={(ref: any) => {
                if (ref && ref.getTotalLength) {
                  pathLength.value = ref.getTotalLength();
                }
              }}
              animatedProps={animatedProps}
            />
            
            {/* Subtle horizontal grid lines */}
            {[0, 0.5, 1].map((ratio, i) => (
              <Path 
                key={`grid-${i}`}
                d={`M 0 ${height - paddingY - (ratio) * (height - paddingY * 2)} L ${chartWidth} ${height - paddingY - (ratio) * (height - paddingY * 2)}`}
                stroke={theme.colors.border}
                strokeWidth={StyleSheet.hairlineWidth}
                strokeDasharray="4 4"
              />
            ))}

            {data.map((d, i) => {
              const x = paddingX + i * stepX;
              const y = height - paddingY - (d.value / max) * (height - paddingY * 2);
              
              // Highest point marker
              if (d.value === max && max > 0) {
                return (
                  <G key={i}>
                    <Circle cx={x} cy={y} r={6} fill={theme.colors.primary} fillOpacity={0.2} />
                    <Circle cx={x} cy={y} r={3} fill={theme.colors.surface} stroke={theme.colors.primary} strokeWidth={2} />
                  </G>
                );
              }
              
              return (
                <Circle key={i} cx={x} cy={y} r={3} fill={theme.colors.surface} stroke={theme.colors.primary} strokeWidth={1.5} />
              );
            })}
          </Svg>
          
          <View style={styles.xAxis}>
            {data.map((d, i) => (
              <Text key={i} style={styles.xLabel}>{d.label}</Text>
            ))}
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
  },
  cardTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  emptyState: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  xAxis: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 8, 
    marginTop: 4 
  },
  xLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
  }
});

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalyticsStore } from '../hooks/useAnalyticsStore';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';
import { EmptyStateCard } from '../components';

export const AnalyticsScreen = () => {
  const { categoryDistribution, weeklySpending, monthlyTrend, fetchAnalytics } = useAnalyticsStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const hasData = categoryDistribution.length > 0 || weeklySpending.length > 0 || monthlyTrend.length > 0;

  // Find max values for relative sizing
  const maxWeekly = Math.max(...weeklySpending.map(w => w.value), 1);
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Analytics</Text>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasData ? (
          <EmptyStateCard 
            emoji="📊"
            title="No analytics available"
            subtitle="Add transactions to generate beautiful insights and charts."
          />
        ) : (
          <>
            {/* Category Breakdown (Progress Bars) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Category Breakdown</Text>
              {categoryDistribution.length > 0 ? (
                <View style={styles.categoriesContainer}>
                  {categoryDistribution.map((cat, index) => {
                    const total = categoryDistribution.reduce((acc, curr) => acc + curr.value, 0);
                    const percentage = total > 0 ? (cat.value / total) * 100 : 0;
                    
                    return (
                      <View key={index} style={styles.categoryRow}>
                        <View style={styles.categoryHeader}>
                          <View style={styles.categoryLabelRow}>
                            <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                            <Text style={styles.categoryLabel}>{cat.label}</Text>
                          </View>
                          <Text style={styles.categoryValue}>₹{cat.value.toFixed(0)}</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: cat.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No data for this month.</Text>
              )}
            </View>

            {/* Weekly Spending (Bar Chart) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weekly Spending</Text>
              {weeklySpending.length > 0 ? (
                <View style={styles.barChartContainer}>
                  {weeklySpending.map((day, index) => {
                    const heightPercent = (day.value / maxWeekly) * 100;
                    return (
                      <View key={index} style={styles.barColumn}>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                        </View>
                        <Text style={styles.barLabel}>{day.label}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No data for this week.</Text>
              )}
            </View>

            {/* Monthly Trend (Simple List for now) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Trend</Text>
              {monthlyTrend.length > 0 ? (
                <View style={styles.trendContainer}>
                  {monthlyTrend.map((month, index) => (
                    <View key={index} style={styles.trendRow}>
                      <Text style={styles.trendLabel}>{month.label}</Text>
                      <Text style={styles.trendValue}>₹{month.value.toFixed(0)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No trend data available.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.h1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100, // Bottom tab clearance
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.xxl,
    textAlign: 'center',
  },
  
  // Categories (Progress Bars)
  categoriesContainer: {
    marginTop: spacing.xs,
  },
  categoryRow: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  categoryLabel: {
    ...typography.body,
    fontWeight: '500',
  },
  categoryValue: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Weekly Spending (Bar Chart)
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barBg: {
    height: 140,
    width: 24,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
  },
  barLabel: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  
  // Monthly Trend
  trendContainer: {
    marginTop: spacing.xs,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trendLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  trendValue: {
    ...typography.bodyLg,
    fontWeight: '600',
  }
});

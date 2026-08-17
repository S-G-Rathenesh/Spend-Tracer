import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalyticsStore } from '../hooks/useAnalyticsStore';
import { useAppTheme, AppTheme } from '../theme/theme';
import { EmptyStateCard } from '../components';

import { AnalyticsFilter } from '../components/analytics/AnalyticsFilter';
import { FinancialSummary } from '../components/analytics/FinancialSummary';
import { ExpenseTrendChart } from '../components/analytics/ExpenseTrendChart';
import { CategoryBreakdown } from '../components/analytics/CategoryBreakdown';
import { WeeklySpending } from '../components/analytics/WeeklySpending';
import { AIInsightsCard } from '../components/analytics/AIInsightsCard';
import { SmsIntelligence } from '../components/analytics/SmsIntelligence/SmsIntelligence';

export const AnalyticsScreen = () => {
  const { 
    categoryDistribution, 
    weeklySpending, 
    monthlyTrend, 
    topMerchants, 
    totalIncome, 
    totalExpense, 
    messageDistribution,
    fetchAnalytics, 
    selectedMonth, 
    selectedYear, 
    setSelectedMonth, 
    setSelectedYear 
  } = useAnalyticsStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    fetchAnalytics();
    const txSub = DeviceEventEmitter.addListener('TransactionUpdated', fetchAnalytics);
    return () => txSub.remove();
  }, [selectedMonth, selectedYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const hasData = categoryDistribution.length > 0 || weeklySpending.length > 0 || monthlyTrend.length > 0 || totalIncome > 0 || totalExpense > 0 || (messageDistribution && messageDistribution.total > 0);
  
  const sortedCategories = [...categoryDistribution].sort((a, b) => b.value - a.value);
  const highestCategory = sortedCategories.length > 0 ? sortedCategories[0] : undefined;
  const topMerchant = topMerchants.length > 0 ? topMerchants[0] : undefined;

  let periodLabel = 'this month';
  if (selectedMonth === 'All Time') {
    periodLabel = selectedYear ? `in ${selectedYear}` : 'overall';
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnalyticsFilter 
        theme={theme}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthSelect={setSelectedMonth}
        onYearSelect={setSelectedYear}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {!hasData ? (
          <View style={{ marginTop: 40, paddingHorizontal: theme.spacing.xl }}>
            <EmptyStateCard 
              emoji="📊"
              title="No spending data yet"
              subtitle="Add your first transaction to see beautiful analytics."
            />
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            <FinancialSummary 
              theme={theme} 
              totalIncome={totalIncome} 
              totalExpense={totalExpense} 
            />

            <SmsIntelligence
              theme={theme}
              data={messageDistribution}
            />

            <ExpenseTrendChart 
              data={monthlyTrend} 
              theme={theme} 
            />

            <CategoryBreakdown 
              data={sortedCategories} 
              theme={theme} 
              totalExpense={totalExpense} 
            />

            <WeeklySpending 
              data={weeklySpending} 
              theme={theme} 
            />

            <AIInsightsCard 
              theme={theme} 
              highestCategory={highestCategory} 
              topMerchant={topMerchant} 
              periodLabel={periodLabel}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: theme.spacing.sm,
  },
  contentWrapper: {
    // We removed paddingHorizontal here and moved it to the individual components (lg instead of xl)
    // to give charts more room to breathe and reduce the "boxy" feel.
    width: '100%',
  }
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { useAuthStore } from '../hooks/useAuthStore';
import { SummaryCard, TransactionCard, SectionHeader, FloatingActionButton, BalanceCard, QuickActionGrid, EmptyStateCard, BottomSheet } from '../components';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type RootStackParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  AddTransaction: undefined;
  Analytics: undefined;
  SmsDebug: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export const DashboardScreen = () => {
  const { 
    todaySpending, monthlySpending, netBalance, monthlyIncome,
    recentTransactions, isLoading, fetchDashboardData 
  } = useDashboardStore();
  
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const [fabSheetVisible, setFabSheetVisible] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    fetchDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 18) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  };

  const quickActions = [
    { icon: 'plus', label: 'Add Expense', color: colors.accent, onPress: () => navigation.navigate('AddTransaction') },
    { icon: 'chart-pie', label: 'Analytics', color: colors.income, onPress: () => navigation.navigate('Analytics') },
    { icon: 'format-list-bulleted', label: 'History', color: colors.warning, onPress: () => navigation.navigate('Transactions') },
    { icon: 'message-text', label: 'SMS Sync', color: '#00BCD4', onPress: () => navigation.navigate('SmsDebug') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Image 
            source={require('../../assets/spendly_logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarContainer}>
          <Icon name="account" size={24} color={colors.accentLight} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <BalanceCard 
          balance={netBalance}
          income={monthlyIncome}
          expense={monthlySpending}
        />

        <QuickActionGrid actions={quickActions} />

        <View style={styles.summaryRow}>
          <SummaryCard 
            title="Today's Spending" 
            amount={todaySpending} 
            type="negative"
            icon="calendar-today" 
          />
          <SummaryCard 
            title="Monthly Spending" 
            amount={monthlySpending} 
            type="negative"
            icon="calendar-month" 
          />
        </View>

        <SectionHeader 
          title="Recent Transactions" 
          actionText="View All" 
          onActionPress={() => navigation.navigate('Transactions')} 
        />

        {recentTransactions.length === 0 && !isLoading ? (
          <EmptyStateCard 
            emoji="💸"
            title="No expenses yet"
            subtitle="Start tracking your expenses to see them here."
            buttonText="Add Expense"
            onButtonPress={() => navigation.navigate('AddTransaction')}
          />
        ) : (
          recentTransactions.map(tx => (
            <TransactionCard key={tx.id} transaction={tx} onPress={() => navigation.navigate('AddTransaction')} />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      
      <FloatingActionButton onPress={() => setFabSheetVisible(true)} />

      <BottomSheet
        visible={fabSheetVisible}
        onClose={() => setFabSheetVisible(false)}
        title="Add New"
        options={[
          { icon: '📝', label: 'Add Manual Expense', onPress: () => navigation.navigate('AddTransaction') },
          { icon: '📩', label: 'Import from SMS', color: colors.warning, onPress: () => navigation.navigate('SmsDebug') },
          { icon: '📸', label: 'Scan Receipt (Coming Soon)', color: colors.textSecondary, onPress: () => {} },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: spacing.sm,
    borderRadius: 8,
  },
  greeting: {
    ...typography.labelSm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    ...typography.h2,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  }
});

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, useWindowDimensions, AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { useAuthStore } from '../hooks/useAuthStore';
import { SummaryCard, TransactionCard, SectionHeader, FloatingActionButton, BalanceCard, QuickActionGrid, EmptyStateCard, BottomSheet, CategoryVerificationModal, SmsRecoveryPrompt, SmsRecoveryProgress, Toast } from '../components';
import { Transaction } from '../types/Transaction';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { SmsRecoveryService } from '../sms/SmsRecoveryService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme, AppTheme } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PDFExportService } from '../utils/PDFExportService';
import { AnimatedEmoji } from '../components/AnimatedEmoji';

type RootStackParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  TransactionDetails: { transactionId: string };
  AddTransaction: undefined;
  Analytics: undefined;
  SmsDebug: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export const DashboardScreen = () => {
  const { 
    todaySpending, monthlySpending, netBalance, monthlyIncome,
    recentTransactions, pendingVerificationTransactions, isLoading, fetchDashboardData 
  } = useDashboardStore();
  
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const [fabSheetVisible, setFabSheetVisible] = useState(false);
  const [activeVerificationTx, setActiveVerificationTx] = useState<Transaction | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [showRecoveryProgress, setShowRecoveryProgress] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;

  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // TEST PDF EXPORT AT RUNTIME
    console.log("[TEST] Running automated PDF export test on mount...");
    PDFExportService.exportTransactions([], "Automated Test")
      .then(res => console.log("[TEST] PDF SUCCESS:", res))
      .catch(err => console.log("[TEST] PDF FAILED:", err));
  }, []);

  useEffect(() => {
    fetchDashboardData();
    checkFirstLaunchRecovery();

    // Auto Quick Sync on launch
    triggerAutoSync();

    // Listen for foreground transitions
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        triggerAutoSync();
      }
    });

    const txSub = DeviceEventEmitter.addListener('TransactionUpdated', () => {
      fetchDashboardData();
    });

    return () => {
      subscription.remove();
      txSub.remove();
    };
  }, []);

  const triggerAutoSync = async () => {
    // Only show "Syncing..." if we're actually going to run it, 
    // but we let SmsRecoveryService handle the optimization.
    setToastMessage('Syncing new transactions...');
    setToastVisible(true);
    
    const result = await SmsRecoveryService.autoQuickSync();
    
    if (result.status === 'skipped_optimization') {
      // Too fast, just hide silently
      setToastVisible(false);
    } else if (result.status === 'up_to_date') {
      setToastMessage('Already up to date');
      // Toast handles its own duration, but we might want to refresh data just in case
      fetchDashboardData();
    } else if (result.status === 'success') {
      setToastMessage(`${result.syncedCount} new transaction${result.syncedCount === 1 ? '' : 's'} added`);
      if (result.syncedCount > 0) {
        fetchDashboardData();
      }
    } else {
      // error or no_permission
      setToastVisible(false);
    }
  };

  const checkFirstLaunchRecovery = async () => {
    const hasShown = await SettingsRepository.get('has_shown_recovery_prompt');
    if (!hasShown) {
      // Check if DB is basically empty
      if (todaySpending === 0 && monthlySpending === 0 && recentTransactions.length === 0) {
        setShowRecoveryPrompt(true);
      } else {
        await SettingsRepository.set('has_shown_recovery_prompt', 'true');
      }
    }
  };

  const handleStartRecovery = async (mode: 'full' | 'quick') => {
    setShowRecoveryPrompt(false);
    await SettingsRepository.set('has_shown_recovery_prompt', 'true');
    setShowRecoveryProgress(true);
    SmsRecoveryService.startRecovery(mode);
  };

  const onRefresh = () => {
    fetchDashboardData();
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 4) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 4) return '🌙';
    if (hour < 12) return '☀️';
    if (hour < 18) return '🌤️';
    return '🌙';
  };

  const quickActions = [
    { icon: 'plus', label: 'Add Expense', color: theme.colors.accent, onPress: () => navigation.navigate('AddTransaction') },
    { icon: 'chart-pie', label: 'Analytics', color: theme.colors.income, onPress: () => navigation.navigate('Analytics') },
    { icon: 'format-list-bulleted', label: 'History', color: theme.colors.warning, onPress: () => navigation.navigate('Transactions') },
    { icon: 'message-text', label: 'SMS Sync', color: '#00BCD4', onPress: triggerAutoSync },
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.greeting, { marginBottom: 0 }]}>{getGreetingText()} </Text>
            <AnimatedEmoji emoji={getGreetingEmoji()} type="pulse" size={14} />
          </View>
        </View>
        <TouchableOpacity style={styles.avatarContainer}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={{ width: 44, height: 44, borderRadius: 22 }} />
          ) : (
            <Icon name="account" size={24} color={theme.colors.accentLight} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
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
            suffix={todaySpending === 0 ? <AnimatedEmoji emoji="🎉" type="bounce" size={20} /> : undefined}
          />
          <SummaryCard 
            title="Monthly Spending" 
            amount={monthlySpending} 
            type="negative"
            icon="calendar-month" 
          />
        </View>

        {pendingVerificationTransactions.length > 0 && (
          <TouchableOpacity 
            style={[styles.pendingCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary, borderWidth: 1 }]}
            onPress={() => navigation.navigate('PendingVerification' as any)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                Spend Tracer needs your help identifying {pendingVerificationTransactions.length} transaction(s).
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Tap here to review and improve AI accuracy.</Text>
            </View>
            <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>Review Now</Text>
            </View>
          </TouchableOpacity>
        )}

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
          recentTransactions.map((tx, index) => (
            <TransactionCard key={tx.id} transaction={tx} index={index} onPress={() => navigation.navigate('TransactionDetails', { transactionId: tx.id })} />
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
          { icon: '📩', label: 'Import from SMS', color: theme.colors.warning, onPress: () => navigation.navigate('SmsDebug') },
          { icon: '📸', label: 'Scan Receipt (Coming Soon)', color: theme.colors.textSecondary, onPress: () => {} },
        ]}
      />

      <CategoryVerificationModal
        visible={!!activeVerificationTx}
        transaction={activeVerificationTx}
        onClose={() => setActiveVerificationTx(null)}
        onSuccess={() => {
          setActiveVerificationTx(null);
          fetchDashboardData();
        }}
      />

      <SmsRecoveryPrompt
        visible={showRecoveryPrompt}
        onSkip={async () => {
          setShowRecoveryPrompt(false);
          await SettingsRepository.set('has_shown_recovery_prompt', 'true');
        }}
        onRestore={() => handleStartRecovery('full')}
      />

      <SmsRecoveryProgress
        visible={showRecoveryProgress}
        onClose={(status) => {
          setShowRecoveryProgress(false);
          if (status === 'completed') {
            fetchDashboardData();
          }
        }}
      />

      <Toast 
        visible={toastVisible} 
        message={toastMessage} 
        onDismiss={() => setToastVisible(false)} 
        duration={3000} 
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
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
    marginRight: theme.spacing.sm,
    borderRadius: 8,
  },
  greeting: {
    ...theme.typography.labelSm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    ...theme.typography.h2,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  }
});

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { useAnalyticsStore } from '../hooks/useAnalyticsStore';
import { useAuthStore } from '../hooks/useAuthStore';
import { SMSPermission } from '../sms/SMSPermission';
import { SMSRepository } from '../sms/SMSRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';

type NavigationProp = NativeStackNavigationProp<any, 'Settings'>;

export const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;
  const { isDarkMode, currency, updateSetting, loadSettings } = useSettingsStore();
  const { fetchTransactions } = useTransactionStore();
  const { fetchDashboardData } = useDashboardStore();
  const { fetchAnalytics } = useAnalyticsStore();
  const { user, logout } = useAuthStore();

  const [smsEnabled, setSmsEnabled] = React.useState(false);

  useEffect(() => {
    loadSettings();
    checkSmsState();
  }, []);

  const checkSmsState = async () => {
    const val = await SettingsRepository.get('smsMonitoringEnabled');
    setSmsEnabled(val === 'true');
  };

  const handleToggleSms = async (val: boolean) => {
    if (val) {
      const granted = await SMSPermission.requestPermissions();
      if (granted) {
        setSmsEnabled(true);
        await SettingsRepository.set('smsMonitoringEnabled', 'true');
      } else {
        setSmsEnabled(false);
      }
    } else {
      setSmsEnabled(false);
      await SettingsRepository.set('smsMonitoringEnabled', 'false');
    }
  };

  const handleClearSmsCache = () => {
    Alert.alert('Clear SMS Cache', 'Remove all SMS pipeline records?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
          await SMSRepository.clearAll();
          Alert.alert('Success', 'SMS cache cleared.');
      }}
    ]);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete all transactions? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everything', 
          style: 'destructive',
          onPress: async () => {
            await TransactionRepository.deleteAll();
            fetchTransactions();
            fetchDashboardData();
            fetchAnalytics();
            Alert.alert('Success', 'All transactions deleted.');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Settings</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Icon name="account" size={32} color={colors.accentLight} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileEmail}>{user?.email || 'Guest User'}</Text>
            <Text style={styles.profileSubtitle}>SpendGuard Account</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="logout" size={24} color={colors.expense} />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.sectionGroup}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                <Icon name="theme-light-dark" size={20} color={colors.accentLight} />
              </View>
              <Text style={styles.rowText}>Dark Mode</Text>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={(val) => updateSetting('isDarkMode', val.toString())}
              trackColor={{ false: colors.surfaceLight, true: colors.accent }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(74, 222, 128, 0.1)' }]}>
                <Icon name="currency-inr" size={20} color={colors.income} />
              </View>
              <Text style={styles.rowText}>Currency</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valueText}>{currency}</Text>
              <Icon name="chevron-right" size={20} color={colors.textDisabled} />
            </View>
          </TouchableOpacity>
        </View>

        {/* AI & Automation */}
        <Text style={styles.sectionLabel}>AI & AUTOMATION</Text>
        <View style={styles.sectionGroup}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                <Icon name="message-text" size={20} color={colors.warning} />
              </View>
              <Text style={styles.rowText}>SMS Monitoring</Text>
            </View>
            <Switch 
              value={smsEnabled} 
              onValueChange={handleToggleSms}
              trackColor={{ false: colors.surfaceLight, true: colors.accent }}
              thumbColor={colors.white}
            />
          </View>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleClearSmsCache}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceLight }]}>
                <Icon name="message-alert" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>Clear SMS Cache</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('SmsDebug')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceLight }]}>
                <Icon name="bug" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>SMS Debug Tool</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textDisabled} />
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
        <View style={styles.sectionGroup}>
          <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Coming Soon', 'Export feature is planned for a future update.')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                <Icon name="export" size={20} color="#38BDF8" />
              </View>
              <Text style={styles.rowText}>Export Data</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleDeleteAll}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}>
                <Icon name="delete-alert" size={20} color={colors.expense} />
              </View>
              <Text style={[styles.rowText, { color: colors.expense }]}>Delete All Transactions</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.sectionGroup}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceLight }]}>
                <Icon name="shield-account" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>Privacy Policy</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceLight }]}>
                <Icon name="information" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>About SpendGuard</Text>
            </View>
            <Text style={styles.valueText}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    paddingBottom: 100, // Room for bottom tab
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    ...typography.h3,
    marginBottom: 4,
  },
  profileSubtitle: {
    ...typography.caption,
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  sectionLabel: {
    ...typography.overline,
    marginLeft: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xxl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowText: {
    ...typography.bodyLg,
  },
  valueText: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68, // Aligns with text
  }
});

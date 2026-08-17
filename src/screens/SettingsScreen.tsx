import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, useWindowDimensions, Modal, Share, Linking, TextInput, Image, NativeModules } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { useAnalyticsStore } from '../hooks/useAnalyticsStore';
import { useAuthStore } from '../hooks/useAuthStore';
import { SMSPermission } from '../sms/SMSPermission';
import { SMSRepository } from '../sms/SMSRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SmsRecoveryService } from '../sms/SmsRecoveryService';
import { SmsRecoveryProgress } from '../components/SmsRecoveryProgress';
import { SmsReclassifier } from '../ai/SmsReclassifier';
import { AnimatedEmoji } from '../components/AnimatedEmoji';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, AppTheme } from '../theme/theme';
import auth from '@react-native-firebase/auth';

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
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [smsEnabled, setSmsEnabled] = React.useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = React.useState(false);
  const [nameModalVisible, setNameModalVisible] = React.useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = React.useState(false);
  const [showRecoveryProgress, setShowRecoveryProgress] = React.useState(false);
  const [editNickname, setEditNickname] = React.useState(user?.displayName || '');
  const { updateUserDisplayName } = useAuthStore();

  useEffect(() => {
    loadSettings();
    checkSmsPermission();
  }, []);

  const handleRebuildClose = async (status: string) => {
    setShowRecoveryProgress(false);
    if (status === 'completed') {
      try {
        await fetchTransactions();
        await fetchDashboardData();
        await fetchAnalytics();
        
        Alert.alert(
          "Transaction history rebuilt successfully.",
          "All transactions and analytics have been refreshed.",
          [{ text: "OK", onPress: () => navigation.navigate('Dashboard') }]
        );
      } catch (e) {
        Alert.alert("Refresh Failed", "Could not refresh stores after rebuild.");
      }
    } else if (status === 'error') {
      Alert.alert("Rebuild Failed", "An error occurred while rebuilding transaction history. Your existing data was not modified.");
    }
  };

  const checkSmsPermission = async () => {
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
      'Delete All Transactions?',
      'This action will permanently delete all transactions and analytics. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await TransactionRepository.deleteAll();
              await MerchantCategoryRepository.deleteAll();
              
              await fetchTransactions();
              await fetchDashboardData();
              await fetchAnalytics();
              
              console.log('[DELETE_ALL] Dashboard refresh status: Completed');
              Alert.alert('Success', 'All transactions deleted successfully.');
            } catch (err: any) {
              console.log('[DELETE_ALL] Error:', err);
              Alert.alert('Error', 'Deletion failed.');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }}
    ]);
  };

  const handleExportData = async () => {
    try {
      const transactions = await TransactionRepository.getAll();
      if (transactions.length === 0) {
        Alert.alert('No Data', 'No transactions available to export.');
        return;
      }

      Alert.alert('Export Format', 'Choose the export format:', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'PDF', onPress: () => exportDataFormatted('pdf', transactions) },
        { text: 'CSV', onPress: () => exportDataFormatted('csv', transactions) },
        { text: 'JSON', onPress: () => exportDataFormatted('json', transactions) }
      ]);
    } catch (error) {
      console.log('[EXPORT] Error:', error);
      Alert.alert('Error', 'Failed to read data.');
    }
  };

  const [exportState, setExportState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const exportDataFormatted = async (format: 'csv' | 'json' | 'pdf', transactions: any[]) => {
    try {
      setExportState('loading');
      if (format === 'pdf') {
        const { PDFExportService } = require('../utils/PDFExportService');
        const now = new Date();
        const rangeStr = `All Time up to ${now.toLocaleDateString()}`;
        
        console.log('[PDF_EXPORT] Generation started');
        const filePath = await PDFExportService.exportTransactions(transactions, rangeStr);
        
        if (!filePath) {
          throw new Error("PDF generation returned no file path");
        }
        
        console.log(`[PDF_EXPORT] Generated path: ${filePath}`);
        
        const { FileExportModule } = NativeModules;
        if (!FileExportModule) {
           throw new Error("Native FileExportModule is missing.");
        }
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const pdfFileName = `SpendTracer_Report_${dateStr}.pdf`;
        
        console.log('[PDF_EXPORT] Saving to Downloads...');
        const destinationPath = await FileExportModule.copyFileToDownloads(filePath, pdfFileName, 'application/pdf');
        
        console.log(`[PDF_EXPORT] Destination: ${destinationPath}`);
        console.log('[PDF_EXPORT] Export completed successfully');
        
        setExportState('success');
        setTimeout(() => setExportState('idle'), 3000);

        Alert.alert('Success', 'PDF report saved to Downloads successfully.', [
          { text: 'OK', style: 'cancel' }
        ]);
        return;
      }

      let content = '';
      let filename = '';
      let mimeType = '';

      if (format === 'csv') {
        content = 'Date,Merchant,Category,Income/Expense,Amount,Payment Mode,Bank,Reference Number,Notes\n';
        transactions.forEach(t => {
          content += `"${new Date(t.date).toISOString().split('T')[0]}","${t.merchantId || ''}","${t.categoryName || ''}","${t.type}","${t.amount}","${t.transactionType || ''}","${t.bank || ''}","${t.referenceNumber || ''}","${t.notes || ''}"\n`;
        });
        filename = `SpendTracer_Export_${Date.now()}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(transactions, null, 2);
        filename = `SpendTracer_Export_${Date.now()}.json`;
        mimeType = 'application/json';
      }

      console.log(`[EXPORT] Total transactions exported: ${transactions.length}`);
      console.log(`[EXPORT] File size: ${content.length} bytes`);

      const { FileExportModule } = NativeModules;
      if (FileExportModule) {
        const path = await FileExportModule.saveToDownloads(filename, content, mimeType);
        console.log(`[EXPORT] File path: ${path}`);
        console.log(`[EXPORT] Export completion status: Success`);
        
        setExportState('success');
        setTimeout(() => setExportState('idle'), 3000);

        Alert.alert('Success', 'Export completed successfully.', [
          { text: 'OK', style: 'cancel' },
          { text: 'Share', onPress: () => Share.share({ title: 'Spend Tracer Data', message: `Exported to Downloads: ${filename}\n\n` + content }) }
        ]);
      } else {
        console.log(`[EXPORT] Export completion status: Native module missing, using Share fallback.`);
        await Share.share({ title: 'Spend Tracer Data', message: content });
        setExportState('success');
        setTimeout(() => setExportState('idle'), 3000);
      }
    } catch (error: any) {
      console.log(`[EXPORT] Any permission errors: `, error);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
      Alert.alert('Error', 'Export failed: ' + error.message);
    }
  };

  const handleRebuildHistory = async () => {
    const lastSync = await SettingsRepository.get('last_sms_recovery_timestamp');
    const options = [
      { text: 'Cancel', style: 'cancel' as const },
      { 
        text: 'Full Rebuild', 
        style: 'destructive' as const, 
        onPress: () => {
          setShowRecoveryProgress(true);
          SmsRecoveryService.startRecovery('full');
        } 
      }
    ];

    if (lastSync) {
      options.splice(1, 0, {
        text: 'Quick Sync',
        style: 'default' as const,
        onPress: () => {
          setShowRecoveryProgress(true);
          SmsRecoveryService.startRecovery('quick');
        }
      });
    }

    Alert.alert(
      'Rebuild Transaction History',
      'This will rebuild your transaction database from your SMS inbox. Existing duplicate transactions will not be created.',
      options
    );
  };

  const handleReclassifyHistory = async () => {
    Alert.alert(
      'Reclassify SMS History',
      'This will re-run the latest AI on all previously saved SMS. If a message was incorrectly flagged as a transaction, it will be deleted from your records. This is a safe operation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          style: 'default',
          onPress: async () => {
            try {
              // We could use a progress state, but for now we'll just show an alert when it's done.
              await SmsReclassifier.reclassifyAll();
              
              await fetchTransactions();
              await fetchDashboardData();
              await fetchAnalytics();
              
              Alert.alert('Success', 'SMS history has been reclassified with the latest AI logic.');
            } catch (e: any) {
              Alert.alert('Error', 'Failed to reclassify SMS history: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const handleSaveNickname = async () => {
    if (editNickname.trim()) {
      try {
        await auth().currentUser?.updateProfile({ displayName: editNickname.trim() });
        updateUserDisplayName(editNickname.trim());
        setNameModalVisible(false);
      } catch (e) {
        Alert.alert('Error', 'Failed to update profile.');
      }
    }
  };

  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY'];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Settings</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <Icon name="account" size={32} color={theme.colors.accentLight} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.profileEmail, { flexShrink: 1 }]} numberOfLines={1}>
                {user?.displayName || user?.email?.split('@')[0] || 'Guest User'}
              </Text>
              <TouchableOpacity onPress={() => { setEditNickname(user?.displayName || user?.email?.split('@')[0] || ''); setNameModalVisible(true); }} style={{ padding: 4, marginLeft: 8 }}>
                <Icon name="pencil" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileSubtitle}>{user?.email || 'Spend Tracer Account'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="logout" size={24} color={theme.colors.expense} />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.sectionGroup}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.accentMuted }]}>
                <Icon name="theme-light-dark" size={20} color={theme.colors.accentLight} />
              </View>
              <Text style={styles.rowText}>Dark Mode</Text>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={(val) => updateSetting('isDarkMode', val.toString())}
              trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.accent }}
              thumbColor={theme.colors.white}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={() => setCurrencyModalVisible(true)}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.incomeMuted }]}>
                <Icon name="currency-inr" size={20} color={theme.colors.income} />
              </View>
              <Text style={styles.rowText}>Currency</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valueText}>{currency}</Text>
              <Icon name="chevron-right" size={20} color={theme.colors.textDisabled} />
            </View>
          </TouchableOpacity>
        </View>

        {/* AI & Automation */}
        <Text style={styles.sectionLabel}>AI & AUTOMATION</Text>
        <View style={styles.sectionGroup}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.warningMuted }]}>
                <Icon name="message-text" size={20} color={theme.colors.warning} />
              </View>
              <Text style={styles.rowText}>SMS Monitoring</Text>
            </View>
            <Switch 
              value={smsEnabled} 
              onValueChange={handleToggleSms}
              trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.accent }}
              thumbColor={theme.colors.white}
            />
          </View>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleClearSmsCache}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceLight }]}>
                <Icon name="message-alert" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>Clear SMS Cache</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('SmsDebug')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceLight }]}>
                <Icon name="bug" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>SMS Debug Tool</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textDisabled} />
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
        <View style={styles.sectionGroup}>
          <TouchableOpacity style={styles.row} onPress={handleExportData} disabled={exportState === 'loading'}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                {exportState === 'loading' ? (
                  <AnimatedEmoji emoji="⏳" type="spin" size={18} />
                ) : exportState === 'success' ? (
                  <AnimatedEmoji emoji="🎉" type="bounce" size={18} />
                ) : exportState === 'error' ? (
                  <AnimatedEmoji emoji="❌" type="wiggle" size={18} />
                ) : (
                  <Icon name="export" size={20} color="#38BDF8" />
                )}
              </View>
              <Text style={styles.rowText}>
                {exportState === 'loading' ? 'Exporting...' : exportState === 'success' ? 'Export Successful!' : 'Export Data'}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleRebuildHistory}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.accentMuted }]}>
                <Icon name="database-sync" size={20} color={theme.colors.accent} />
              </View>
              <Text style={styles.rowText}>Rebuild Transaction History</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleReclassifyHistory}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.warningMuted }]}>
                <Icon name="brain" size={20} color={theme.colors.warning} />
              </View>
              <Text style={styles.rowText}>Reclassify SMS History</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleDeleteAll}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.expenseMuted }]}>
                <Icon name="delete-alert" size={20} color={theme.colors.expense} />
              </View>
              <Text style={[styles.rowText, { color: theme.colors.expense }]}>Delete All Transactions</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.sectionGroup}>
          <TouchableOpacity style={styles.row} onPress={() => setPrivacyModalVisible(true)}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceLight }]}>
                <Icon name="shield-account" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>Privacy Policy</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={() => Alert.alert('About Spend Tracer', 'Version 1.0.0\n\nYour personal, smart expense tracker. Take control of your finances securely.')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceLight }]}>
                <Icon name="information" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.rowText}>About Spend Tracer</Text>
            </View>
            <Text style={styles.valueText}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            {currencies.map(curr => (
              <TouchableOpacity
                key={curr}
                style={styles.modalOption}
                onPress={() => {
                  updateSetting('currency', curr);
                  setCurrencyModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, currency === curr && styles.modalOptionTextSelected]}>
                  {curr}
                </Text>
                {currency === curr && <Icon name="check" size={20} color={theme.colors.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCurrencyModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Nickname Modal */}
      <Modal
        visible={nameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Nickname</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                color: theme.colors.text,
                ...theme.typography.bodyLg,
                marginBottom: theme.spacing.lg,
              }}
              value={editNickname}
              onChangeText={setEditNickname}
              placeholder="Enter your nickname"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus={true}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity style={{ padding: theme.spacing.md, marginRight: theme.spacing.sm }} onPress={() => setNameModalVisible(false)}>
                <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: theme.spacing.md, backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md }} onPress={handleSaveNickname}>
                <Text style={[styles.modalCancelText, { color: theme.colors.white }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <ScrollView style={{ marginBottom: theme.spacing.lg }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.bodyMd, lineHeight: 24 }}>
                Welcome to Spend Tracer's Privacy Policy. 
                {'\n\n'}
                1. Data Collection: We collect only your email address and display name for authentication purposes via Firebase. We do not sell your personal data.
                {'\n\n'}
                2. Transaction Data: Your expenses and incomes are stored securely in Google Firestore or locally on your device using SQLite. Only you can access your personal transaction history.
                {'\n\n'}
                3. SMS Sync: If enabled, Spend Tracer reads incoming SMS messages locally on your device to parse transaction amounts. This data is never transmitted to third-party servers for analysis.
                {'\n\n'}
                4. Third-party Services: We use Firebase Auth and Firestore. Their respective privacy policies apply to data processed by their services.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPrivacyModalVisible(false)}>
              <Text style={[styles.modalCancelText, { color: theme.colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SmsRecoveryProgress
        visible={showRecoveryProgress}
        onClose={handleRebuildClose}
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    ...theme.typography.h1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 100, // Room for bottom tab
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    ...theme.typography.h3,
    marginBottom: 4,
  },
  profileSubtitle: {
    ...theme.typography.caption,
  },
  logoutBtn: {
    padding: theme.spacing.sm,
  },
  sectionLabel: {
    ...theme.typography.overline,
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.xxl,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
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
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rowText: {
    ...theme.typography.bodyLg,
  },
  valueText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 68, // Aligns with text
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalOptionText: {
    ...theme.typography.bodyLg,
  },
  modalOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  modalCancelText: {
    // There is no typography.button in theme, use bodyLg and fontWeight
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.expense,
  }
});

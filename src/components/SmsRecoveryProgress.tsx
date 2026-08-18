import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../theme/theme';
import { SmsRecoveryService, RecoveryProgress } from '../sms/SmsRecoveryService';

interface Props {
  visible: boolean;
  onClose: (status: string) => void;
}

export const SmsRecoveryProgress: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useAppTheme();
  const [progress, setProgress] = useState<RecoveryProgress>({
    status: 'idle', 
    totalSms: 0, 
    processedSms: 0, 
    restoredTransactions: 0, 
    skippedTransactions: 0,
    classifiedTransactions: 0,
    classifiedNonTransactions: 0,
    classifiedAdvertisements: 0,
    classifiedSpam: 0
  });

  useEffect(() => {
    SmsRecoveryService.subscribe((p) => {
      setProgress(p);
      if (p.status === 'completed' || p.status === 'cancelled' || p.status === 'error') {
        setTimeout(() => onClose(p.status), p.status === 'completed' ? 2500 : 500);
      }
    });
  }, [onClose]);

  if (!visible) return null;

  const getStatusText = () => {
    switch (progress.status) {
      case 'reading': return 'Reading SMS inbox...';
      case 'processing': return 'Processing SMS...';
      case 'completed': return 'Restoration & Analysis Complete!';
      case 'cancelled': return 'Cancelled.';
      case 'error': return 'An error occurred.';
      default: return 'Starting...';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{getStatusText()}</Text>
          
          {progress.status === 'processing' && (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginVertical: 16 }} />
          )}

          <View style={styles.statsContainer}>
            <Text style={[styles.statHeader, { color: theme.colors.textPrimary }]}>
              Processed: {progress.processedSms} / {progress.totalSms}
            </Text>
            
            <View style={[styles.breakdownBox, { borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Classified:</Text>
              <Text style={[styles.statItem, { color: theme.colors.income || '#22C55E' }]}>
                💳 {progress.classifiedTransactions} Transactions
              </Text>
              <Text style={[styles.statItem, { color: '#3B82F6' }]}>
                💬 {progress.classifiedNonTransactions} Non-Transactions
              </Text>
              <Text style={[styles.statItem, { color: theme.colors.warning || '#F59E0B' }]}>
                📢 {progress.classifiedAdvertisements} Advertisements
              </Text>
              <Text style={[styles.statItem, { color: theme.colors.expense || '#EF4444' }]}>
                🛡️ {progress.classifiedSpam} Spam
              </Text>
            </View>

            <Text style={[styles.restoredStat, { color: theme.colors.primary }]}>
              Restored Transactions: {progress.restoredTransactions}
            </Text>
          </View>
          
          {progress.status === 'processing' && (
            <TouchableOpacity 
              style={[styles.cancelBtn, { borderColor: theme.colors.border }]} 
              onPress={() => SmsRecoveryService.cancelRecovery()}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsContainer: {
    width: '100%',
    marginVertical: 12,
  },
  statHeader: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  breakdownBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statItem: {
    fontSize: 14,
    fontWeight: '500',
    marginVertical: 2,
  },
  restoredStat: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 12,
  }
});

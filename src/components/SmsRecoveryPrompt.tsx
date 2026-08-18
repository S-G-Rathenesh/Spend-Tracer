import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  visible: boolean;
  onRestore: () => void;
  onSkip: () => void;
}

export const SmsRecoveryPrompt: React.FC<Props> = ({ visible, onRestore, onSkip }) => {
  const theme = useAppTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <Icon name="database-sync" size={48} color={theme.colors.accent} style={{ alignSelf: 'center', marginBottom: 16 }} />
          
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Restore Transactions</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Would you like Spend Tracer to rebuild your transaction history from your SMS inbox?
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.skipBtn, { borderColor: theme.colors.border }]} onPress={onSkip}>
              <Text style={{ color: theme.colors.textSecondary, fontWeight: 'bold' }}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.restoreBtn, { backgroundColor: theme.colors.accent }]} onPress={onRestore}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Restore Transactions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtn: {
    borderWidth: 1,
  },
  restoreBtn: {
  }
});

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SMSRepository } from '../sms/SMSRepository';
import { IncomingSMS, SMSStatus } from '../sms/SMSModels';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, AppTheme } from '../theme/theme';

export const SmsDebugScreen = () => {
  const [messages, setMessages] = useState<IncomingSMS[]>([]);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;

  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const data = await SMSRepository.getLatest(100);
    setMessages(data);
  };

  const getStatusColor = (status: SMSStatus) => {
    switch(status) {
      case SMSStatus.PENDING: return theme.colors.warning; // Orange
      case SMSStatus.COMPLETED: return theme.colors.success; // Green
      case SMSStatus.FAILED: return theme.colors.error; // Red
      case SMSStatus.IGNORED: return theme.colors.textDisabled; // Grey
      default: return theme.colors.text;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SMS Debug (Internal)</Text>
        <TouchableOpacity onPress={loadMessages}>
          <Icon name="refresh" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No SMS found in pipeline.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sender}>{item.sender}</Text>
              <Text style={styles.date}>{new Date(item.receivedAt).toLocaleString()}</Text>
            </View>
            <Text style={styles.bank}>Bank: {item.bank || 'None'}</Text>
            <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
            
            <View style={styles.footer}>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.processingStatus) }]}>
                <Text style={styles.badgeText}>{item.processingStatus}</Text>
              </View>
              {item.isProcessed && <Icon name="check-circle" size={16} color={theme.colors.success} />}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: theme.spacing.lg, alignItems: 'center' },
  headerTitle: { ...theme.typography.h2, color: theme.colors.text, fontWeight: 'bold' },
  list: { padding: theme.spacing.lg },
  empty: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  sender: { color: theme.colors.text, fontWeight: 'bold', fontSize: 16 },
  date: { color: theme.colors.textMuted, fontSize: 12 },
  bank: { color: theme.colors.accent, fontSize: 14, marginBottom: theme.spacing.sm },
  message: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: theme.spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});

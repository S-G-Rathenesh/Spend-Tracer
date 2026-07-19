import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SMSRepository } from '../sms/SMSRepository';
import { IncomingSMS, SMSStatus } from '../sms/SMSModels';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const SmsDebugScreen = () => {
  const [messages, setMessages] = useState<IncomingSMS[]>([]);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const data = await SMSRepository.getLatest(100);
    setMessages(data);
  };

  const getStatusColor = (status: SMSStatus) => {
    switch(status) {
      case SMSStatus.PENDING: return '#FF9800'; // Orange
      case SMSStatus.COMPLETED: return '#4CAF50'; // Green
      case SMSStatus.FAILED: return '#F44336'; // Red
      case SMSStatus.IGNORED: return '#9E9E9E'; // Grey
      default: return '#FFF';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SMS Debug (Internal)</Text>
        <TouchableOpacity onPress={loadMessages}>
          <Icon name="refresh" size={24} color="#FFF" />
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
              {item.isProcessed && <Icon name="check-circle" size={16} color="#4CAF50" />}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  headerTitle: { fontSize: 20, color: '#FFF', fontWeight: 'bold' },
  list: { padding: 16 },
  empty: { color: '#B3B3B3', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sender: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  date: { color: '#B3B3B3', fontSize: 12 },
  bank: { color: '#03DAC6', fontSize: 14, marginBottom: 8 },
  message: { color: '#B3B3B3', fontSize: 14, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});

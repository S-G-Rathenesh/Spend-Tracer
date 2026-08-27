import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../../theme/theme';
import { EnrichedSMS, MessageAnalytics } from '../../../analytics/MessageAnalytics';
import { SmsItemCard } from './SmsItemCard';
import { useAnalyticsStore } from '../../../hooks/useAnalyticsStore';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface Props {
  visible: boolean;
  category: 'Transactions' | 'Non-Transactions' | 'Advertisements' | 'Spam' | 'All' | null;
  onClose: () => void;
  theme: AppTheme;
}

type FilterType = 'All' | 'Transactions' | 'Non-Transactions' | 'Advertisements' | 'Spam';

export const MessageListModal = ({ visible, category, onClose, theme }: Props) => {
  const [messages, setMessages] = useState<EnrichedSMS[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  
  const { selectedMonth, selectedYear } = useAnalyticsStore();

  useEffect(() => {
    if (visible && category) {
      setActiveFilter(category === 'All' ? 'All' : category as FilterType);
      loadMessages();
    } else {
      setMessages([]);
      setSearchQuery('');
    }
  }, [visible, category, selectedMonth, selectedYear]);

  const loadMessages = async () => {
    if (!category) return;
    setLoading(true);
    try {
      // Always load all messages for the selected time range so user can switch filter tabs seamlessly
      const data = await MessageAnalytics.getDetailedMessagesByCategory('All', selectedMonth, selectedYear);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load SMS messages', error);
    } finally {
      setLoading(false);
    }
  };

  // Compute category counts from the loaded messages
  const counts = useMemo(() => {
    let all = messages.length;
    let tx = 0;
    let nonTx = 0;
    let ads = 0;
    let spam = 0;

    for (const msg of messages) {
      switch (msg.classification.predictedClass) {
        case 'Transaction': tx++; break;
        case 'Personal': nonTx++; break;
        case 'Promotion': ads++; break;
        case 'Scam': spam++; break;
        default: nonTx++; break;
      }
    }
    return { all, tx, nonTx, ads, spam };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter(sms => {
      // 1. Text Search across message, sender, merchant, and category
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesText = sms.message.toLowerCase().includes(q);
        const matchesSender = sms.sender.toLowerCase().includes(q);
        const matchesMerchant = sms.linkedTransaction?.merchantId?.toLowerCase().includes(q);
        const matchesCategory = sms.linkedTransaction?.categoryName?.toLowerCase().includes(q);
        const matchesBank = sms.bank?.toLowerCase().includes(q);
        if (!matchesText && !matchesSender && !matchesMerchant && !matchesCategory && !matchesBank) {
          return false;
        }
      }

      // 2. Classification Filter
      if (activeFilter !== 'All') {
        const mappedClass = activeFilter === 'Transactions' ? 'Transaction' :
                            activeFilter === 'Non-Transactions' ? 'Personal' :
                            activeFilter === 'Advertisements' ? 'Promotion' : 'Scam';
        if (sms.classification.predictedClass !== mappedClass) return false;
      }

      return true;
    });
  }, [messages, searchQuery, activeFilter]);

  const renderItem = useCallback(({ item }: { item: EnrichedSMS }) => {
    return <SmsItemCard sms={item} theme={theme} />;
  }, [theme]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const filters: { key: FilterType; label: string; count: number; icon: string }[] = [
    { key: 'All', label: 'All', count: counts.all, icon: 'email-multiple-outline' },
    { key: 'Transactions', label: 'Transactions', count: counts.tx, icon: 'credit-card-outline' },
    { key: 'Non-Transactions', label: 'Non-Txns', count: counts.nonTx, icon: 'message-text-outline' },
    { key: 'Advertisements', label: 'Ads', count: counts.ads, icon: 'bullhorn-outline' },
    { key: 'Spam', label: 'Spam', count: counts.spam, icon: 'shield-alert-outline' },
  ];

  const renderFilterChips = () => {
    return (
      <View style={styles.filterScrollWrapper}>
        <FlatList 
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.key;
            return (
              <TouchableOpacity 
                style={[
                  styles.filterChip, 
                  { 
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border
                  }
                ]}
                onPress={() => setActiveFilter(item.key)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={item.icon} 
                  size={14} 
                  color={isActive ? theme.colors.onPrimary : theme.colors.textSecondary} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[
                  styles.filterText,
                  { color: isActive ? theme.colors.onPrimary : theme.colors.textSecondary }
                ]}>
                  {item.label} ({item.count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          {/* Header Bar */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Icon name="arrow-left" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                SMS Intelligence
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {loading ? 'Analyzing SMS records...' : `${filteredMessages.length} of ${messages.length} messages`}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Box */}
          <View style={styles.searchSection}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search by sender, bank, merchant, or text..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="close-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Chips */}
          {renderFilterChips()}

          {/* Messages List or Empty State */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading message analysis...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMessages}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={() => (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.centerBox}>
                  <Text style={{ fontSize: 44, marginBottom: 12 }}>🔍</Text>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    No messages found
                  </Text>
                  <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                    {searchQuery.trim() ? `No SMS matched "${searchQuery}" in ${activeFilter}` : `No messages classified under ${activeFilter}`}
                  </Text>
                </Animated.View>
              )}
            />
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
    marginLeft: -4,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 46,
    marginLeft: 8,
    fontSize: 14,
  },
  filterScrollWrapper: {
    paddingVertical: 6,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  }
});


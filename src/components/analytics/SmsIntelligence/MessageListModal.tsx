import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
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
  
  // When opened via "View All", category is 'All', but we can still filter inside
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
      // If the modal was opened with a specific category, we can just load that.
      // But if it was opened with 'All', we load 'All'.
      // For simplicity, we just load 'All' if the category is 'All', or the specific one.
      const data = await MessageAnalytics.getDetailedMessagesByCategory(category, selectedMonth, selectedYear);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load SMS messages', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(sms => {
      // 1. Text Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesText = sms.message.toLowerCase().includes(q);
        const matchesSender = sms.sender.toLowerCase().includes(q);
        const matchesMerchant = sms.linkedTransaction?.merchantId?.toLowerCase().includes(q);
        const matchesCategory = sms.linkedTransaction?.categoryName?.toLowerCase().includes(q);
        if (!matchesText && !matchesSender && !matchesMerchant && !matchesCategory) {
          return false;
        }
      }

      // 2. Chip Filter (only applies if we loaded 'All' initially, 
      // or if we allow changing categories inside the modal)
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

  const renderFilterChips = () => {
    if (category !== 'All') return null; // Only show category filters if "View All" was pressed

    const filters: FilterType[] = ['All', 'Transactions', 'Non-Transactions', 'Advertisements', 'Spam'];
    return (
      <View style={styles.filterScrollWrapper}>
        <FlatList 
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={item => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.filterChip, 
                { 
                  backgroundColor: activeFilter === item ? theme.colors.primary : theme.colors.surface,
                  borderColor: activeFilter === item ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === item ? theme.colors.onPrimary : theme.colors.textSecondary }
              ]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                {category === 'All' ? 'All Messages' : category}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {loading ? 'Analyzing...' : `${filteredMessages.length} messages`}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.searchSection}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Icon name="magnify" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search messages..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {renderFilterChips()}

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredMessages}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              ListEmptyComponent={() => (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.centerBox}>
                  <Text style={{ fontSize: 48, marginBottom: 16 }}>🤖</Text>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    No messages found
                  </Text>
                  <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                    Try adjusting your search or filters.
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 8,
    marginLeft: -8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 15,
  },
  filterScrollWrapper: {
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
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
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  }
});

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ToastAndroid, Platform, Alert } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  useSharedValue, 
  interpolate 
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppTheme } from '../../../theme/theme';
import { EnrichedSMS } from '../../../analytics/MessageAnalytics';

interface Props {
  sms: EnrichedSMS;
  theme: AppTheme;
}

export const SmsItemCard = ({ sms, theme }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const expandProgress = useSharedValue(0);

  const toggleExpand = () => {
    const nextState = !expanded;
    setExpanded(nextState);
    expandProgress.value = withTiming(nextState ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.ease)
    });
  };

  const expandedStyle = useAnimatedStyle(() => {
    return {
      opacity: expandProgress.value,
      maxHeight: interpolate(expandProgress.value, [0, 1], [0, 800]),
      overflow: 'hidden'
    };
  });

  const getCategoryTheme = () => {
    switch (sms.classification.predictedClass) {
      case 'Transaction': return { icon: 'credit-card', emoji: '💳', color: theme.colors.income || '#22C55E' };
      case 'Personal': return { icon: 'message-text', emoji: '💬', color: '#3B82F6' };
      case 'Promotion': return { icon: 'bullhorn', emoji: '📢', color: theme.colors.warning || '#F59E0B' };
      case 'Scam': return { icon: 'shield-alert', emoji: '🛡️', color: theme.colors.expense || '#EF4444' };
      default: return { icon: 'email-outline', emoji: '✉️', color: theme.colors.textSecondary };
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const { emoji, color } = getCategoryTheme();
  const isLinked = !!sms.linkedTransaction;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
            <Text style={styles.iconText}>{emoji}</Text>
          </View>
          <View style={styles.headerTextCol}>
            <View style={styles.senderRow}>
              <Text style={[styles.sender, { color: theme.colors.textPrimary }]} numberOfLines={1}>{sms.sender}</Text>
              <View style={[styles.miniBadge, { backgroundColor: color + '15' }]}>
                <Text style={[styles.miniBadgeText, { color }]}>{sms.classification.predictedClass}</Text>
              </View>
            </View>
            <Text style={[styles.preview, { color: theme.colors.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
              {sms.message}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>{formatDate(sms.receivedAt)}</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textSecondary} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>

      <Animated.View style={expandedStyle}>
        <View style={[styles.expandedContent, { borderTopColor: theme.colors.border }]}>
          
          {/* Full SMS Body Box */}
          <View style={[styles.fullMessageBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Text style={[styles.fullMessageTitle, { color: theme.colors.textSecondary }]}>FULL SMS TEXT</Text>
            <Text style={[styles.fullMessageText, { color: theme.colors.textPrimary }]} selectable>
              {sms.message}
            </Text>
          </View>

          {/* Classification & Confidence Metadata */}
          <View style={styles.metaGrid}>
            <View style={[styles.metaItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Category</Text>
              <Text style={[styles.metaValue, { color }]}>{sms.classification.predictedClass}</Text>
            </View>
            <View style={[styles.metaItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Confidence</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>
                {((sms.confidence || 0.9) * 100).toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* Decision Reasons */}
          {sms.classification.reasons && sms.classification.reasons.length > 0 && (
            <View style={[styles.reasonsBox, { borderColor: theme.colors.border }]}>
              <Text style={[styles.reasonsTitle, { color: theme.colors.textSecondary }]}>Classification Evidence</Text>
              {sms.classification.reasons.map((reason, idx) => (
                <View key={idx} style={styles.reasonItem}>
                  <Text style={[styles.reasonBullet, { color }]}>•</Text>
                  <Text style={[styles.reasonText, { color: theme.colors.textPrimary }]}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Linked Transaction Details */}
          {isLinked && sms.linkedTransaction && (
            <View style={[styles.linkedBox, { borderColor: color + '40', backgroundColor: color + '08' }]}>
              <View style={styles.linkedHeader}>
                <Icon name="check-decagram" size={18} color={color} />
                <Text style={[styles.linkedTitle, { color }]}> Created Transaction</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.value, { color: sms.linkedTransaction.type === 'Credit' ? theme.colors.income : theme.colors.textPrimary }]}>
                  {sms.linkedTransaction.type === 'Credit' ? '+' : '-'}₹{sms.linkedTransaction.amount.toLocaleString('en-IN')}
                </Text>
              </View>
              {sms.linkedTransaction.merchantId && (
                <View style={styles.detailRow}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Merchant / Payee</Text>
                  <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{sms.linkedTransaction.merchantId}</Text>
                </View>
              )}
              {sms.linkedTransaction.categoryName && (
                <View style={styles.detailRow}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Category</Text>
                  <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{sms.linkedTransaction.categoryName}</Text>
                </View>
              )}
              {sms.linkedTransaction.status && (
                <View style={styles.detailRow}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Status</Text>
                  <Text style={[styles.value, { color: sms.linkedTransaction.status === 'COMPLETED' ? theme.colors.income : theme.colors.expense }]}>
                    {sms.linkedTransaction.status}
                  </Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: color + '25' }]}
                onPress={() => navigation.navigate('TransactionDetails', { transactionId: sms.linkedTransaction!.id })}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color }]}>View Full Transaction Details →</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 16,
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  sender: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  preview: {
    fontSize: 13,
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  fullMessageBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  fullMessageTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fullMessageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkedBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkedTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  actionBtn: {
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonsBox: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  reasonsTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  reasonBullet: {
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  }
});


import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
      duration: 300,
      easing: Easing.out(Easing.ease)
    });
  };

  const expandedStyle = useAnimatedStyle(() => {
    return {
      opacity: expandProgress.value,
      height: interpolate(expandProgress.value, [0, 1], [0, 'auto' as any]),
      overflow: 'hidden'
    };
  });

  const getCategoryTheme = () => {
    switch (sms.classification.predictedClass) {
      case 'Transaction': return { icon: '💳', color: theme.colors.income || '#22C55E' };
      case 'Personal': return { icon: '💬', color: '#3B82F6' };
      case 'Promotion': return { icon: '📢', color: theme.colors.warning || '#F59E0B' };
      case 'Scam': return { icon: '🛡️', color: theme.colors.expense || '#EF4444' };
      default: return { icon: '✉️', color: theme.colors.textSecondary };
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const { icon, color } = getCategoryTheme();
  const isLinked = !!sms.linkedTransaction;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.sender} numberOfLines={1}>{sms.sender}</Text>
            <Text style={styles.preview} numberOfLines={expanded ? undefined : 1}>{sms.message}</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(sms.receivedAt)}</Text>
      </TouchableOpacity>

      <Animated.View style={expandedStyle}>
        <View style={styles.expandedContent}>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Classification</Text>
            <View style={[styles.badge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.badgeText, { color }]}>{sms.classification.predictedClass}</Text>
            </View>
          </View>
          
          {sms.classification.confidence && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>AI Confidence</Text>
              <Text style={styles.value}>
                {(sms.classification.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {sms.classification.reasons && sms.classification.reasons.length > 0 && (
            <View style={styles.reasonsBox}>
              <Text style={styles.reasonsTitle}>Why?</Text>
              {sms.classification.reasons.map((reason, idx) => (
                <View key={idx} style={styles.reasonItem}>
                  <Text style={styles.reasonBullet}>•</Text>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          {isLinked && sms.linkedTransaction && (
            <View style={[styles.linkedBox, { borderColor: color + '30', backgroundColor: color + '05' }]}>
              <View style={styles.linkedHeader}>
                <Icon name="check-circle" size={16} color={color} />
                <Text style={[styles.linkedTitle, { color }]}> Transaction Created</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>{sms.linkedTransaction.amount}</Text>
              </View>
              {sms.linkedTransaction.merchantId && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Merchant</Text>
                  <Text style={styles.value}>{sms.linkedTransaction.merchantId}</Text>
                </View>
              )}
              {sms.linkedTransaction.date && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.value}>{formatDate(sms.linkedTransaction.date)}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: color + '20' }]}
                onPress={() => navigation.navigate('TransactionDetails', { transactionId: sms.linkedTransaction!.id })}
              >
                <Text style={[styles.actionBtnText, { color }]}>View Transaction →</Text>
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
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  sender: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  preview: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  date: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  linkedBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reasonsBox: {
    marginTop: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  reasonBullet: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginRight: 6,
    lineHeight: 18,
  },
  reasonText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 18,
    flex: 1,
  }
});

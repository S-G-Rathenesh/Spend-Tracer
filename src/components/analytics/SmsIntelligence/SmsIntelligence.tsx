import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing,
  useReducedMotion
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../../theme/theme';
import { MessageDistribution } from '../../../analytics/MessageAnalytics';
import { AiRobot } from './AiRobot';
import { ClassificationConnector } from './ClassificationConnector';
import { ClassificationCard } from './ClassificationCard';
import { MessageListModal } from './MessageListModal';

interface Props {
  theme: AppTheme;
  data: MessageDistribution | null;
}

const AnimatedContainer = ({ children, delay }: any) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
    } else {
      opacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
      translateY.value = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    }
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

export const SmsIntelligence = ({ theme, data }: Props) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedCategory, setSelectedCategory] = useState<'Transactions' | 'Non-Transactions' | 'Advertisements' | 'Spam' | 'All' | null>(null);
  
  if (!data) return null;

  if (data.total === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🤖</Text>
          <Text style={styles.emptyTitle}>No messages analyzed yet</Text>
          <Text style={styles.emptySub}>Spend Tracer will classify your SMS messages here.</Text>
        </View>
      </View>
    );
  }

  const categories = [
    { label: 'Transactions' as const, count: data.transactions, emoji: '💳', color: theme.colors.income || '#22C55E', delay: 200 },
    { label: 'Non-Transactions' as const, count: data.nonTransaction, emoji: '💬', color: '#3B82F6', delay: 300 },
    { label: 'Advertisements' as const, count: data.advertisement, emoji: '📢', color: theme.colors.warning || '#F59E0B', delay: 400 },
    { label: 'Spam' as const, count: data.spam, emoji: '🛡️', color: theme.colors.expense || '#EF4444', delay: 500 },
  ];

  return (
    <View style={styles.container}>
      
      <AnimatedContainer delay={0}>
        <AiRobot theme={theme} totalMessages={data.total} />
      </AnimatedContainer>

      <AnimatedContainer delay={100}>
        <ClassificationConnector theme={theme} />
      </AnimatedContainer>

      <View style={styles.grid}>
        {categories.map((cat) => (
          <ClassificationCard
            key={cat.label}
            theme={theme}
            label={cat.label}
            count={cat.count}
            total={data.total}
            emoji={cat.emoji}
            color={cat.color}
            delay={cat.delay}
            onPress={() => setSelectedCategory(cat.label)}
          />
        ))}
      </View>

      <AnimatedContainer delay={600}>
        <TouchableOpacity 
          activeOpacity={0.7} 
          style={styles.viewAllBtn}
          onPress={() => setSelectedCategory('All')}
        >
          <Text style={styles.viewAllText}>View All Messages</Text>
          <Icon name="arrow-right" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </AnimatedContainer>

      <MessageListModal 
        visible={!!selectedCategory}
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
        theme={theme}
      />
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewAllText: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginRight: 8,
  }
});

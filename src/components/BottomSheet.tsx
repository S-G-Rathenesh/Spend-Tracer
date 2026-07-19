import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Modal, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

interface BottomSheetOption {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: BottomSheetOption[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BottomSheet: React.FC<Props> = ({ visible, onClose, title, options }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        {title && <Text style={styles.title}>{title}</Text>}

        {options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.option}
            onPress={() => { opt.onPress(); onClose(); }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: opt.color ? `${opt.color}20` : colors.accentMuted }]}>
              <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
            </View>
            <Text style={styles.optionLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.section,
    paddingTop: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  optionLabel: {
    ...typography.bodyLg,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  cancelText: {
    ...typography.label,
    color: colors.textSecondary,
  },
});

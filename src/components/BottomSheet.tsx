import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Modal, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { useAppTheme, AppTheme } from '../theme/theme';

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
  options?: BottomSheetOption[];
  children?: React.ReactNode;
  height?: string | number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BottomSheet: React.FC<Props> = ({ visible, onClose, title, options, children, height }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

      <Animated.View style={[styles.sheet, height ? { height } : undefined, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        {title && <Text style={styles.title}>{title}</Text>}

        {children}

        {options && options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.option}
            onPress={() => { opt.onPress(); onClose(); }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: opt.color ? `${opt.color}20` : theme.colors.accentMuted }]}>
              <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
            </View>
            <Text style={styles.optionLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}

        {!children && (
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.section,
    paddingTop: theme.spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight,
    alignSelf: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  optionLabel: {
    ...theme.typography.bodyLg,
    fontWeight: '500',
    color: theme.colors.text,
  },
  cancelButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
  },
  cancelText: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
});

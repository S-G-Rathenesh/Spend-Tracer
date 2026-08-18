import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppTheme } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MONTHS = [
  { label: 'Jan', value: '1' }, { label: 'Feb', value: '2' }, { label: 'Mar', value: '3' },
  { label: 'Apr', value: '4' }, { label: 'May', value: '5' }, { label: 'Jun', value: '6' },
  { label: 'Jul', value: '7' }, { label: 'Aug', value: '8' }, { label: 'Sep', value: '9' },
  { label: 'Oct', value: '10' }, { label: 'Nov', value: '11' }, { label: 'Dec', value: '12' },
];
const YEARS = ['2023', '2024', '2025', '2026', '2027'];

interface Props {
  theme: AppTheme;
  selectedMonth: string;
  selectedYear: string;
  onMonthSelect: (m: string) => void;
  onYearSelect: (y: string) => void;
}

export const AnalyticsFilter = ({ theme, selectedMonth, selectedYear, onMonthSelect, onYearSelect }: Props) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Determine initial period based on current store props
  let initialPeriod: 'All' | 'Month' | 'Year' = 'Month';
  if (!selectedYear) {
    initialPeriod = 'All';
  } else if (selectedMonth === 'All Time') {
    initialPeriod = 'Year';
  }
  const [period, setPeriod] = useState<'All' | 'Month' | 'Year'>(initialPeriod);

  const handlePeriodChange = (p: 'All' | 'Month' | 'Year') => {
    setPeriod(p);
    if (p === 'All') {
      onMonthSelect('All Time');
      onYearSelect('');
    } else if (p === 'Year') {
      onMonthSelect('All Time');
      if (!selectedYear) onYearSelect(new Date().getFullYear().toString());
    } else if (p === 'Month') {
      if (selectedMonth === 'All Time') onMonthSelect((new Date().getMonth() + 1).toString());
      if (!selectedYear) onYearSelect(new Date().getFullYear().toString());
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Analytics</Text>
          {(period === 'Month' || period === 'Year') && (
            <View style={styles.yearDropdown}>
              <Text style={styles.yearText}>{selectedYear || new Date().getFullYear().toString()}</Text>
              <Icon name="menu-down" size={20} color={theme.colors.textPrimary} />
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.filterIcon}>
          <Icon name="tune" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.segmentContainer}>
        {['All', 'Month', 'Year'].map((p) => (
          <TouchableOpacity 
            key={p} 
            style={[styles.segmentBtn, period === p && styles.segmentActive]}
            onPress={() => handlePeriodChange(p as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'Month' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {MONTHS.map(m => (
            <TouchableOpacity key={m.value} style={[styles.chip, selectedMonth === m.value && styles.chipActive]} onPress={() => onMonthSelect(m.value)} activeOpacity={0.7}>
              <Text style={[styles.chipText, selectedMonth === m.value && styles.chipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {period === 'Year' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {YEARS.map(y => (
            <TouchableOpacity key={y} style={[styles.chip, selectedYear === y && styles.chipActive]} onPress={() => onYearSelect(y)} activeOpacity={0.7}>
              <Text style={[styles.chipText, selectedYear === y && styles.chipTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    marginRight: theme.spacing.md,
  },
  yearDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  yearText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: theme.colors.onPrimary,
  },
  scroll: {
    maxHeight: 40,
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.bodySm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.onPrimary,
  }
});

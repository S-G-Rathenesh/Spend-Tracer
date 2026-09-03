import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppTheme } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnalyticsPeriod } from '../../analytics/AnalyticsDateUtils';
import { YearPickerModal } from './YearPickerModal';
import { AnalyticsFilterModal } from './AnalyticsFilterModal';

const MONTHS = [
  { label: 'Jan', value: 1 }, { label: 'Feb', value: 2 }, { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 }, { label: 'May', value: 5 }, { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 }, { label: 'Aug', value: 8 }, { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 }, { label: 'Nov', value: 11 }, { label: 'Dec', value: 12 },
];

const AVAILABLE_YEARS = [2023, 2024, 2025, 2026, 2027];

interface Props {
  theme: AppTheme;
  period: AnalyticsPeriod;
  selectedMonth: number;
  selectedYear: number;
  typeFilter: 'ALL' | 'Debit' | 'Credit';
  categoryFilter: string | null;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  onMonthSelect: (m: number) => void;
  onYearSelect: (y: number) => void;
  onFilterApply: (type: 'ALL' | 'Debit' | 'Credit', categoryId: string | null) => void;
  onFilterReset: () => void;
}

export const AnalyticsFilter = ({
  theme,
  period,
  selectedMonth,
  selectedYear,
  typeFilter,
  categoryFilter,
  onPeriodChange,
  onMonthSelect,
  onYearSelect,
  onFilterApply,
  onFilterReset,
}: Props) => {
  const [showYearModal, setShowYearModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasActiveCustomFilter = typeFilter !== 'ALL' || categoryFilter !== null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Analytics</Text>
          {period === 'month' && (
            <TouchableOpacity
              style={styles.yearDropdown}
              activeOpacity={0.7}
              onPress={() => setShowYearModal(true)}
            >
              <Text style={styles.yearText}>{selectedYear}</Text>
              <Icon name="menu-down" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterIcon}
          activeOpacity={0.7}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon
            name="tune"
            size={20}
            color={hasActiveCustomFilter ? theme.colors.primary : theme.colors.textSecondary}
          />
          {hasActiveCustomFilter && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* Period Segment Tabs: All / Month / Year */}
      <View style={styles.segmentContainer}>
        {(['all', 'month', 'year'] as const).map((p) => {
          const isActive = period === p;
          const displayLabel = p.charAt(0).toUpperCase() + p.slice(1);
          return (
            <TouchableOpacity
              key={p}
              style={[styles.segmentBtn, isActive && styles.segmentActive]}
              onPress={() => onPeriodChange(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Month horizontal scroll chips when Month is selected */}
      {period === 'month' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {MONTHS.map((m) => {
            const isSelected = selectedMonth === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => onMonthSelect(m.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Year horizontal scroll chips when Year is selected */}
      {period === 'year' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {AVAILABLE_YEARS.map((y) => {
            const isSelected = selectedYear === y;
            return (
              <TouchableOpacity
                key={y}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => onYearSelect(y)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {y}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Year Picker Modal */}
      <YearPickerModal
        visible={showYearModal}
        selectedYear={selectedYear}
        years={AVAILABLE_YEARS}
        theme={theme}
        onSelectYear={onYearSelect}
        onClose={() => setShowYearModal(false)}
      />

      {/* Filter Modal */}
      <AnalyticsFilterModal
        visible={showFilterModal}
        theme={theme}
        currentTypeFilter={typeFilter}
        currentCategoryFilter={categoryFilter}
        onApply={onFilterApply}
        onReset={onFilterReset}
        onClose={() => setShowFilterModal(false)}
      />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 2,
    },
    yearText: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
      fontWeight: '600',
    },
    filterIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      position: 'relative',
    },
    activeDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: 4,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      fontWeight: '600',
    },
    segmentTextActive: {
      color: '#000000',
      fontWeight: '700',
    },
    scroll: {
      maxHeight: 44,
    },
    scrollContent: {
      gap: 8,
      paddingVertical: 2,
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
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    chipTextActive: {
      color: '#000000',
      fontWeight: '700',
    },
  });

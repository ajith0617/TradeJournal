import React, {useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from 'date-fns';
import {
  radius,
  spacing,
  useThemedStyles,
  type AppTypography,
  type ColorPalette,
} from '../theme';
import {formatDisplayDate, todayISO} from '../utils/format';
import {FieldLabel} from './FieldLabel';

interface Props {
  label?: string;
  required?: boolean;
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

type PickerMode = 'days' | 'months' | 'years';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function toDate(iso: string): Date {
  if (!iso) {
    return new Date();
  }
  const d = parseISO(iso);
  return isValid(d) ? d : new Date();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DateField({
  label,
  required,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: Props) {
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>('days');
  const selected = toDate(value || todayISO());
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selected),
  );

  const show = () => {
    setVisibleMonth(startOfMonth(toDate(value || todayISO())));
    setMode('days');
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setMode('days');
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), {weekStartsOn: 1});
    const end = endOfWeek(endOfMonth(visibleMonth), {weekStartsOn: 1});
    return eachDayOfInterval({start, end});
  }, [visibleMonth]);

  const yearOptions = useMemo(() => {
    const nowY = new Date().getFullYear();
    const minY = minimumDate ? minimumDate.getFullYear() : nowY - 40;
    const maxY = maximumDate ? maximumDate.getFullYear() : nowY + 5;
    const years: number[] = [];
    for (let y = maxY; y >= minY; y -= 1) {
      years.push(y);
    }
    return years;
  }, [minimumDate, maximumDate]);

  const min = minimumDate ? startOfDay(minimumDate) : undefined;
  const max = maximumDate ? startOfDay(maximumDate) : undefined;

  const pick = (day: Date) => {
    const d = startOfDay(day);
    if (min && isBefore(d, min)) {
      return;
    }
    if (max && isAfter(d, max)) {
      return;
    }
    onChange(format(d, 'yyyy-MM-dd'));
    close();
  };

  const isDisabled = (day: Date) => {
    const d = startOfDay(day);
    if (min && isBefore(d, min)) {
      return true;
    }
    if (max && isAfter(d, max)) {
      return true;
    }
    return false;
  };

  const selectMonth = (monthIndex: number) => {
    setVisibleMonth(m => startOfMonth(setMonth(m, monthIndex)));
    setMode('days');
  };

  const selectYear = (year: number) => {
    setVisibleMonth(m => startOfMonth(setYear(m, year)));
    setMode('months');
  };

  return (
    <View style={styles.wrap}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <Pressable onPress={show} style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDisplayDate(value) : 'Select date'}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.monthHeader}>
              <Pressable
                onPress={() =>
                  setVisibleMonth(m =>
                    mode === 'years' ? subYears(m, 12) : subMonths(m, 1),
                  )
                }
                hitSlop={12}
                style={styles.navBtn}>
                <Text style={styles.navText}>‹</Text>
              </Pressable>

              <View style={styles.titleRow}>
                <Pressable
                  onPress={() =>
                    setMode(m => (m === 'months' ? 'days' : 'months'))
                  }
                  style={styles.titleChip}>
                  <Text style={styles.monthTitle}>
                    {format(visibleMonth, 'MMM')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setMode(m => (m === 'years' ? 'days' : 'years'))
                  }
                  style={styles.titleChip}>
                  <Text style={styles.monthTitle}>
                    {format(visibleMonth, 'yyyy')}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() =>
                  setVisibleMonth(m =>
                    mode === 'years' ? addYears(m, 12) : addMonths(m, 1),
                  )
                }
                hitSlop={12}
                style={styles.navBtn}>
                <Text style={styles.navText}>›</Text>
              </Pressable>
            </View>

            <Text style={styles.hint}>
              {mode === 'days'
                ? 'Tap month or year to jump quickly'
                : mode === 'months'
                  ? 'Choose a month'
                  : 'Choose a year'}
            </Text>

            {mode === 'days' ? (
              <>
                <View style={styles.weekRow}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <Text key={d} style={styles.weekday}>
                      {d}
                    </Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {days.map(day => {
                    const inMonth = isSameMonth(day, visibleMonth);
                    const selectedDay = value
                      ? isSameDay(day, selected)
                      : false;
                    const disabled = isDisabled(day);
                    const today = isSameDay(day, new Date());

                    return (
                      <Pressable
                        key={day.toISOString()}
                        disabled={disabled}
                        onPress={() => pick(day)}
                        style={[
                          styles.dayCell,
                          selectedDay && styles.daySelected,
                          today && !selectedDay && styles.dayToday,
                        ]}>
                        <Text
                          style={[
                            styles.dayText,
                            !inMonth && styles.dayOutside,
                            disabled && styles.dayDisabled,
                            selectedDay && styles.daySelectedText,
                          ]}>
                          {format(day, 'd')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {mode === 'months' ? (
              <View style={styles.monthGrid}>
                {MONTHS.map((name, index) => {
                  const active = visibleMonth.getMonth() === index;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => selectMonth(index)}
                      style={[
                        styles.monthCell,
                        active && styles.monthCellActive,
                      ]}>
                      <Text
                        style={[
                          styles.monthCellText,
                          active && styles.monthCellTextActive,
                        ]}>
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {mode === 'years' ? (
              <ScrollView
                style={styles.yearList}
                contentContainerStyle={styles.yearListContent}
                showsVerticalScrollIndicator={false}>
                {yearOptions.map(year => {
                  const active = visibleMonth.getFullYear() === year;
                  return (
                    <Pressable
                      key={year}
                      onPress={() => selectYear(year)}
                      style={[
                        styles.yearRow,
                        active && styles.yearRowActive,
                      ]}>
                      <Text
                        style={[
                          styles.yearText,
                          active && styles.yearTextActive,
                        ]}>
                        {year}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <Pressable onPress={close} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: ColorPalette, typography: AppTypography) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
    },
    field: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    value: {
      ...typography.body,
      fontSize: 15,
    },
    placeholder: {
      ...typography.body,
      fontSize: 15,
      color: colors.textDim,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing.lg,
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    titleChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    monthTitle: {
      ...typography.subtitle,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    navBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceElevated,
    },
    navText: {
      ...typography.subtitle,
      fontSize: 22,
      color: colors.accent,
      lineHeight: 26,
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    weekday: {
      flex: 1,
      textAlign: 'center',
      ...typography.caption,
      color: colors.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    daySelected: {
      backgroundColor: colors.accent,
    },
    dayToday: {
      borderWidth: 1,
      borderColor: colors.accent,
    },
    dayText: {
      ...typography.body,
      fontSize: 14,
    },
    dayOutside: {
      color: colors.textDim,
    },
    dayDisabled: {
      color: colors.textDim,
      opacity: 0.4,
    },
    daySelectedText: {
      color: colors.white,
      fontWeight: '700',
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    monthCell: {
      width: '30%',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      marginBottom: spacing.xs,
    },
    monthCellActive: {
      backgroundColor: colors.accentMuted,
      borderColor: colors.accent,
    },
    monthCellText: {
      ...typography.body,
      fontWeight: '600',
    },
    monthCellTextActive: {
      color: colors.accent,
    },
    yearList: {
      maxHeight: 280,
    },
    yearListContent: {
      paddingBottom: spacing.sm,
    },
    yearRow: {
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      marginBottom: spacing.xs,
      backgroundColor: colors.surfaceElevated,
    },
    yearRowActive: {
      backgroundColor: colors.accentMuted,
    },
    yearText: {
      ...typography.subtitle,
    },
    yearTextActive: {
      color: colors.accent,
    },
    cancelBtn: {
      marginTop: spacing.md,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    cancelText: {
      ...typography.body,
      color: colors.textMuted,
    },
  });
}

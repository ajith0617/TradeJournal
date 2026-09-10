import React, {useMemo, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SafeScreen} from '../../components/SafeScreen';
import {ScreenHeader} from '../../components/ScreenHeader';
import {EmptyState} from '../../components/EmptyState';
import {Button} from '../../components/Button';
import {Input} from '../../components/Input';
import {SegmentedControl} from '../../components/SegmentedControl';
import {FadeSlideIn} from '../../components/FadeSlideIn';
import {ContextFilterChip} from '../../components/ContextFilterChip';
import {useConfirm} from '../../components/ConfirmProvider';
import {useJournalStore} from '../../store/journalStore';
import {
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type AppTypography,
  type ColorPalette,
} from '../../theme';
import {createId} from '../../utils/id';
import type {
  ConditionWeight,
  RuleType,
  Strategy,
  StrategyCondition,
} from '../../types';
import {CONDITION_WEIGHT_OPTIONS, conditionWeightLabel} from '../../types';
import {useRotatingQuote} from '../../hooks/useRotatingQuote';
import {todayISO} from '../../utils/format';

const EMPTY_CHECKED: string[] = [];

export function RulesScreen() {
  const {colors} = useTheme();
  const {confirm, notice} = useConfirm();
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const insets = useSafeAreaInsets();
  const strategies = useJournalStore(s => s.strategies);
  const addStrategy = useJournalStore(s => s.addStrategy);
  const updateStrategy = useJournalStore(s => s.updateStrategy);
  const deleteStrategy = useJournalStore(s => s.deleteStrategy);

  const rules = useJournalStore(s => s.rules);
  const addRule = useJournalStore(s => s.addRule);
  const deleteRule = useJournalStore(s => s.deleteRule);
  const toggleRuleCheck = useJournalStore(s => s.toggleRuleCheck);
  const todayCheckedIds = useJournalStore(s => {
    const row = s.ruleChecks.find(c => c.date === todayISO());
    return row?.completedRuleIds ?? EMPTY_CHECKED;
  });
  const checkedSet = useMemo(
    () => new Set(todayCheckedIds),
    [todayCheckedIds],
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState<StrategyCondition[]>([]);
  const [conditionDraft, setConditionDraft] = useState('');
  const [conditionWeight, setConditionWeight] =
    useState<ConditionWeight>('core');

  const [remindersOpen, setRemindersOpen] = useState(false);
  const [strategiesOpen, setStrategiesOpen] = useState(true);
  const [ruleTab, setRuleTab] = useState<RuleType>('pre');
  const [ruleDraft, setRuleDraft] = useState('');

  const reminderList = useMemo(
    () =>
      rules
        .filter(r => r.type === ruleTab)
        .sort((a, b) => a.order - b.order),
    [rules, ruleTab],
  );
  const {quote, nextQuote} = useRotatingQuote();
  const rulesHeading =
    ruleTab === 'pre'
      ? 'Pre-market — prepare before the open'
      : 'Post-market — review before you leave';
  const rulesHeadingColor =
    ruleTab === 'pre' ? colors.warning : colors.accent;

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setConditions([]);
    setConditionDraft('');
    setConditionWeight('core');
    setOpen(true);
  };

  const openEdit = (s: Strategy) => {
    setEditing(s);
    setName(s.name);
    setDescription(s.description);
    setConditions(
      s.conditions.map(c => ({
        ...c,
        weight: c.weight === 'minor' ? 'minor' : 'core',
      })),
    );
    setConditionDraft('');
    setConditionWeight('core');
    setOpen(true);
  };

  const addCondition = () => {
    const text = conditionDraft.trim();
    if (!text) {
      return;
    }
    setConditions(prev => [
      ...prev,
      {id: createId(), text, weight: conditionWeight},
    ]);
    setConditionDraft('');
  };

  const cycleWeight = (id: string) => {
    const order: ConditionWeight[] = ['core', 'minor'];
    setConditions(prev =>
      prev.map(c => {
        if (c.id !== id) {
          return c;
        }
        const idx = order.indexOf(c.weight);
        return {...c, weight: order[(idx + 1) % order.length]};
      }),
    );
  };

  const removeCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  const onSaveStrategy = async () => {
    if (!name.trim()) {
      await notice({
        title: 'Name required',
        message: 'Give this strategy a name before saving.',
        tone: 'warning',
        confirmLabel: 'OK',
      });
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      conditions,
    };
    if (editing) {
      updateStrategy(editing.id, payload);
    } else {
      addStrategy(payload);
    }
    setOpen(false);
  };

  const onDeleteStrategy = async (s: Strategy) => {
    const ok = await confirm({
      title: 'Delete strategy?',
      message: s.name,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (ok) {
      deleteStrategy(s.id);
    }
  };

  const onAddRule = () => {
    const text = ruleDraft.trim();
    if (!text) {
      return;
    }
    addRule(ruleTab, text);
    setRuleDraft('');
  };

  const onDeleteRule = async (id: string, text: string) => {
    const ok = await confirm({
      title: 'Remove reminder?',
      message: text,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (ok) {
      deleteRule(id);
    }
  };

  return (
    <SafeScreen keyboardAvoiding>
      <ScreenHeader
        title="Rules"
        subtitle={quote}
        emphasizeSubtitle
        onSubtitlePress={nextQuote}
        right={
          <Pressable onPress={openCreate} style={styles.addBtn}>
            <Text style={styles.addText}>+ Strategy</Text>
          </Pressable>
        }
      />

      <FlatList
        data={strategiesOpen ? strategies : []}
        keyExtractor={item => item.id}
        extraData={`${todayCheckedIds.join(',')}:${strategiesOpen}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <FadeSlideIn delay={40}>
            <Pressable
              onPress={() => setStrategiesOpen(v => !v)}
              style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionHeaderTitle}>Strategies</Text>
                <Text style={styles.sectionHeaderSub}>
                  Your playbook — trade only when conditions align
                </Text>
              </View>
              <Text style={styles.sectionChevron}>
                {strategiesOpen ? '▾' : '▸'}
              </Text>
            </Pressable>
          </FadeSlideIn>
        }
        ListEmptyComponent={
          strategiesOpen
            ? () => (
                <FadeSlideIn>
                  <EmptyState
                    title="No strategies yet"
                    message="Strategies are your main rules — conditions you trade by."
                    actionLabel="Add strategy"
                    onAction={openCreate}
                  />
                </FadeSlideIn>
              )
            : undefined
        }
        renderItem={({item, index}) => (
          <FadeSlideIn delay={Math.min(index, 8) * 45}>
            <Pressable onPress={() => openEdit(item)} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Pressable onPress={() => onDeleteStrategy(item)}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              </View>
              {item.description ? (
                <Text style={styles.desc}>{item.description}</Text>
              ) : null}
              {item.conditions.map(c => (
                <View key={c.id} style={styles.conditionRow}>
                  <Text style={styles.condition}>· {c.text}</Text>
                  <Text
                    style={[styles.weightTag, weightStyle(c.weight, colors)]}>
                    {conditionWeightLabel(c.weight)} ·{' '}
                    {c.weight === 'core' ? '2' : '1'}
                  </Text>
                </View>
              ))}
            </Pressable>
          </FadeSlideIn>
        )}
        ListFooterComponent={
          <FadeSlideIn delay={120}>
            <View style={styles.remindersBlock}>
              <Pressable
                onPress={() => setRemindersOpen(v => !v)}
                style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionHeaderTitle}>Trade Checklist</Text>
                  <Text style={styles.sectionHeaderSub}>
                    Pre & post market · secondary checklist
                  </Text>
                </View>
                <Text style={styles.sectionChevron}>
                  {remindersOpen ? '▾' : '▸'}
                </Text>
              </Pressable>

              {remindersOpen ? (
                <View style={styles.remindersBody}>
                  <FadeSlideIn trigger={ruleTab} delay={20}>
                    <Text
                      style={[styles.contextLine, {color: rulesHeadingColor}]}>
                      {rulesHeading}
                    </Text>
                  </FadeSlideIn>

                  <View style={styles.tabs}>
                    <ContextFilterChip
                      label="Pre-market"
                      tone="pending"
                      active={ruleTab === 'pre'}
                      onPress={() => setRuleTab('pre')}
                    />
                    <ContextFilterChip
                      label="Post-market"
                      tone="neutral"
                      active={ruleTab === 'post'}
                      onPress={() => setRuleTab('post')}
                    />
                  </View>

                  <View style={styles.addRow}>
                    <TextInput
                      value={ruleDraft}
                      onChangeText={setRuleDraft}
                      placeholder={
                        ruleTab === 'pre'
                          ? 'Add a pre-market reminder…'
                          : 'Add a post-market reminder…'
                      }
                      placeholderTextColor={colors.textDim}
                      style={styles.input}
                      onSubmitEditing={onAddRule}
                    />
                    <Button
                      title="Add"
                      onPress={onAddRule}
                      style={styles.ruleAddBtn}
                    />
                  </View>

                  {reminderList.length === 0 ? (
                    <FadeSlideIn trigger={ruleTab}>
                      <Text style={styles.empty}>
                        No{' '}
                        {ruleTab === 'pre' ? 'pre' : 'post'}
                        -market reminders yet.
                      </Text>
                    </FadeSlideIn>
                  ) : (
                    reminderList.map((item, index) => {
                      const checked = checkedSet.has(item.id);
                      return (
                        <FadeSlideIn
                          key={item.id}
                          delay={Math.min(index, 6) * 40}
                          trigger={`${ruleTab}-${item.id}`}>
                          <View style={styles.row}>
                            <Pressable
                              onPress={() => toggleRuleCheck(item.id)}
                              style={[
                                styles.check,
                                checked && styles.checkOn,
                              ]}>
                              {checked ? (
                                <Text style={styles.checkMark}>✓</Text>
                              ) : null}
                            </Pressable>
                            <Text
                              style={[
                                styles.ruleText,
                                checked && styles.ruleDone,
                              ]}>
                              {item.text}
                            </Text>
                            <Pressable
                              onPress={() =>
                                onDeleteRule(item.id, item.text)
                              }>
                              <Text style={styles.remove}>Remove</Text>
                            </Pressable>
                          </View>
                        </FadeSlideIn>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          </FadeSlideIn>
        }
      />

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modalAvoid}
          behavior="padding"
          enabled>
          <View
            style={[
              styles.modal,
              {
                paddingTop: insets.top + spacing.md,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit strategy' : 'New strategy'}
              </Text>
              <View style={{width: 56}} />
            </View>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag">
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. VWAP Pullback"
              />
              <Input
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="When and how you take this setup"
                multiline
                style={{minHeight: 72, textAlignVertical: 'top'}}
              />

              <Text style={styles.section}>Conditions</Text>
              {conditions.map(c => (
                <View key={c.id} style={styles.condRow}>
                  <View style={styles.condLeft}>
                    <Text style={styles.condText}>{c.text}</Text>
                    <Pressable onPress={() => cycleWeight(c.id)}>
                      <Text
                        style={[
                          styles.weightTag,
                          weightStyle(c.weight, colors),
                        ]}>
                        {conditionWeightLabel(c.weight)} ·{' '}
                        {c.weight === 'core' ? '2' : '1'} · tap to change
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => removeCondition(c.id)}>
                    <Text style={styles.delete}>Remove</Text>
                  </Pressable>
                </View>
              ))}
              <View style={styles.condAdd}>
                <Input
                  label="Add condition"
                  value={conditionDraft}
                  onChangeText={setConditionDraft}
                  placeholder="e.g. Price above VWAP"
                  style={{marginBottom: spacing.md}}
                />
                <SegmentedControl
                  label="Mandatory type"
                  options={CONDITION_WEIGHT_OPTIONS.map(o => ({
                    label: o.label,
                    value: o.value,
                  }))}
                  value={conditionWeight}
                  onChange={setConditionWeight}
                />
                <Button
                  title="Add condition"
                  onPress={addCondition}
                  variant="secondary"
                />
              </View>

              <Button
                title="Save strategy"
                onPress={onSaveStrategy}
                style={styles.save}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeScreen>
  );
}

function weightStyle(weight: ConditionWeight, colors: ColorPalette) {
  if (weight === 'minor') {
    return {color: colors.textMuted};
  }
  return {color: colors.accent};
}

function createStyles(colors: ColorPalette, typography: AppTypography) {
  return StyleSheet.create({
  addBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  addText: {
    ...typography.caption,
    color: colors.onAccent,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  sectionHeaderTitle: {
    ...typography.subtitle,
    fontSize: 15,
  },
  sectionHeaderSub: {
    ...typography.caption,
    marginTop: 2,
  },
  sectionChevron: {
    color: colors.textDim,
    fontSize: 16,
  },
  contextLine: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.subtitle,
    flex: 1,
    paddingRight: spacing.md,
  },
  delete: {
    ...typography.caption,
    color: colors.loss,
  },
  desc: {
    ...typography.bodyMuted,
    marginBottom: spacing.sm,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 6,
  },
  condition: {
    ...typography.body,
    flex: 1,
  },
  weightTag: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  remindersBlock: {
    marginTop: spacing.md,
  },
  remindersBody: {
    marginTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  ruleAddBtn: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkOn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  checkMark: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  ruleText: {
    ...typography.body,
    flex: 1,
  },
  ruleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  remove: {
    ...typography.caption,
    color: colors.loss,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalAvoid: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cancel: {
    ...typography.body,
    color: colors.accent,
    width: 56,
  },
  modalTitle: {
    ...typography.subtitle,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  condRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  condLeft: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 4,
  },
  condText: {
    ...typography.body,
  },
  condAdd: {
    marginTop: spacing.lg,
  },
  save: {
    marginTop: spacing.xl,
  },
});
}


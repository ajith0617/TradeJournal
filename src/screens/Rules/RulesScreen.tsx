import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
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
const MENU_WIDTH = 148;

type StrategyMenuAnchor = {
  strategy: Strategy;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function RulesScreen() {
  const {colors} = useTheme();
  const {confirm, notice} = useConfirm();
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const insets = useSafeAreaInsets();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const moreBtnRefs = useRef<Record<string, View | null>>({});
  const suppressMenuOpenUntil = useRef(0);
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
  const [expandedStrategies, setExpandedStrategies] = useState<
    Record<string, boolean>
  >({});
  const [menuAnchor, setMenuAnchor] = useState<StrategyMenuAnchor | null>(
    null,
  );
  const [ruleTab, setRuleTab] = useState<RuleType>('pre');
  const [ruleDraft, setRuleDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      setStrategiesOpen(true);
    }, []),
  );

  const toggleStrategyExpanded = (id: string) => {
    setExpandedStrategies(prev => ({...prev, [id]: !prev[id]}));
  };

  const openStrategyMenu = (item: Strategy) => {
    if (Date.now() < suppressMenuOpenUntil.current) {
      return;
    }
    const node = moreBtnRefs.current[item.id];
    if (!node) {
      setMenuAnchor({
        strategy: item,
        x: windowWidth - 56,
        y: 120,
        width: 32,
        height: 32,
      });
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setMenuAnchor({strategy: item, x, y, width, height});
    });
  };

  const closeStrategyMenu = () => {
    // Prevent the same tap from reopening via the ⋯ underneath (Android).
    suppressMenuOpenUntil.current = Date.now() + 400;
    setMenuAnchor(null);
  };

  const toggleStrategyMenu = (item: Strategy) => {
    if (menuAnchor?.strategy.id === item.id) {
      closeStrategyMenu();
      return;
    }
    openStrategyMenu(item);
  };

  const menuPosition = useMemo(() => {
    if (!menuAnchor) {
      return null;
    }
    const gap = 6;
    const estimatedHeight = 148;
    const left = Math.min(
      Math.max(12, menuAnchor.x + menuAnchor.width - MENU_WIDTH),
      windowWidth - MENU_WIDTH - 12,
    );
    const below = menuAnchor.y + menuAnchor.height + gap;
    const above = menuAnchor.y - estimatedHeight - gap;
    const top =
      below + estimatedHeight > windowHeight - 24 && above > 24 ? above : below;
    return {top, left, width: MENU_WIDTH};
  }, [menuAnchor, windowHeight, windowWidth]);

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

  const onCopyStrategy = async (s: Strategy) => {
    const ok = await confirm({
      title: 'Copy strategy?',
      message: `Create a copy of “${s.name}”?`,
      confirmLabel: 'Copy',
      tone: 'accent',
    });
    if (!ok) {
      return;
    }
    addStrategy({
      name: `${s.name} (copy)`,
      description: s.description,
      conditions: s.conditions.map(c => ({
        id: createId(),
        text: c.text,
        weight: c.weight === 'minor' ? 'minor' : 'core',
      })),
    });
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
        data={[]}
        keyExtractor={() => 'rules-shell'}
        renderItem={() => null}
        extraData={`${todayCheckedIds.join(',')}:${strategiesOpen}:${remindersOpen}:${JSON.stringify(expandedStrategies)}:${strategies.length}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <FadeSlideIn delay={40}>
            <View style={styles.sectionPanel}>
              <Pressable
                onPress={() => setStrategiesOpen(v => !v)}
                style={styles.sectionHeaderInPanel}>
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

              {strategiesOpen ? (
                <View style={styles.sectionBody}>
                  {strategies.length === 0 ? (
                    <EmptyState
                      title="No strategies yet"
                      message="Strategies are your main rules — conditions you trade by."
                      actionLabel="Add strategy"
                      onAction={openCreate}
                    />
                  ) : (
                    strategies.map((item, index) => {
                      const expanded = !!expandedStrategies[item.id];
                      const menuOpen = menuAnchor?.strategy.id === item.id;
                      return (
                        <FadeSlideIn
                          key={item.id}
                          delay={Math.min(index, 8) * 40}
                          trigger={`${item.id}-${expanded}`}>
                          <View
                            style={[
                              styles.card,
                              index === strategies.length - 1 &&
                                styles.cardLast,
                            ]}>
                            <View style={styles.cardTop}>
                              <Pressable
                                onPress={() =>
                                  toggleStrategyExpanded(item.id)
                                }
                                style={styles.cardMain}
                                accessibilityRole="button"
                                accessibilityState={{expanded}}
                                accessibilityLabel={`${item.name}, ${expanded ? 'collapse' : 'expand'} conditions`}>
                                <View style={styles.cardTitleRow}>
                                  <Text
                                    style={styles.cardTitle}
                                    numberOfLines={2}>
                                    {item.name}
                                  </Text>
                                  <Text style={styles.cardChevron}>
                                    {expanded ? '▾' : '▸'}
                                  </Text>
                                </View>
                                {item.description ? (
                                  <Text
                                    style={styles.desc}
                                    numberOfLines={expanded ? undefined : 2}>
                                    {item.description}
                                  </Text>
                                ) : null}
                              </Pressable>
                              <View
                                ref={node => {
                                  moreBtnRefs.current[item.id] = node;
                                }}
                                collapsable={false}>
                                <Pressable
                                  onPress={() => toggleStrategyMenu(item)}
                                  hitSlop={10}
                                  style={[
                                    styles.moreBtn,
                                    menuOpen && styles.moreBtnActive,
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Actions for ${item.name}`}>
                                  <Text
                                    style={[
                                      styles.moreBtnText,
                                      menuOpen && styles.moreBtnTextActive,
                                    ]}>
                                    ⋯
                                  </Text>
                                </Pressable>
                              </View>
                            </View>

                            {expanded ? (
                              <View style={styles.conditionsBlock}>
                                {item.conditions.length === 0 ? (
                                  <Text style={styles.emptyConditions}>
                                    No conditions yet
                                  </Text>
                                ) : (
                                  item.conditions.map(c => (
                                    <View
                                      key={c.id}
                                      style={styles.conditionRow}>
                                      <Text style={styles.condition}>
                                        · {c.text}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.weightTag,
                                          weightStyle(c.weight, colors),
                                        ]}>
                                        {conditionWeightLabel(c.weight)}
                                      </Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            ) : null}
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
        ListFooterComponent={
          <FadeSlideIn delay={120}>
            <View style={[styles.sectionPanel, styles.sectionPanelSpaced]}>
              <Pressable
                onPress={() => setRemindersOpen(v => !v)}
                style={styles.sectionHeaderInPanel}>
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
                <View style={styles.sectionBody}>
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
                        No {ruleTab === 'pre' ? 'pre' : 'post'}
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

      <Modal
        visible={menuAnchor != null}
        transparent
        animationType="fade"
        onRequestClose={closeStrategyMenu}>
        <View style={styles.menuRoot} pointerEvents="box-none">
          <Pressable
            style={styles.menuDismiss}
            onPress={closeStrategyMenu}
            accessibilityLabel="Dismiss menu"
          />
          {menuAnchor ? (
            <Pressable
              style={[
                styles.menuToggleHit,
                {
                  left: menuAnchor.x - 10,
                  top: menuAnchor.y - 10,
                  width: menuAnchor.width + 20,
                  height: menuAnchor.height + 20,
                },
              ]}
              onPress={closeStrategyMenu}
              accessibilityLabel="Close menu"
            />
          ) : null}
          {menuAnchor && menuPosition ? (
            <View style={[styles.popover, menuPosition]}>
              <Pressable
                style={({pressed}) => [
                  styles.popoverItem,
                  pressed && styles.popoverItemPressed,
                ]}
                onPress={() => {
                  const s = menuAnchor.strategy;
                  closeStrategyMenu();
                  openEdit(s);
                }}>
                <Text style={styles.popoverLabel}>Edit</Text>
              </Pressable>
              <View style={styles.popoverDivider} />
              <Pressable
                style={({pressed}) => [
                  styles.popoverItem,
                  pressed && styles.popoverItemPressed,
                ]}
                onPress={() => {
                  const s = menuAnchor.strategy;
                  closeStrategyMenu();
                  void onCopyStrategy(s);
                }}>
                <Text style={styles.popoverLabel}>Copy</Text>
              </Pressable>
              <View style={styles.popoverDivider} />
              <Pressable
                style={({pressed}) => [
                  styles.popoverItem,
                  pressed && styles.popoverItemPressed,
                ]}
                onPress={() => {
                  const s = menuAnchor.strategy;
                  closeStrategyMenu();
                  void onDeleteStrategy(s);
                }}>
                <Text style={[styles.popoverLabel, styles.popoverDanger]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

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
  sectionPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  sectionPanelSpaced: {
    marginTop: spacing.sm,
  },
  sectionHeaderInPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
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
  sectionBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  contextLine: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  cardLast: {
    marginBottom: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardMain: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  cardTitle: {
    ...typography.subtitle,
    flex: 1,
    paddingRight: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardChevron: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 2,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  moreBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  moreBtnText: {
    ...typography.subtitle,
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 20,
    marginTop: -4,
  },
  moreBtnTextActive: {
    color: colors.accent,
  },
  conditionsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  emptyConditions: {
    ...typography.caption,
    color: colors.textDim,
  },
  menuRoot: {
    flex: 1,
  },
  menuDismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menuToggleHit: {
    position: 'absolute',
  },
  popover: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  popoverItem: {
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
  },
  popoverItemPressed: {
    backgroundColor: colors.accentMuted,
  },
  popoverDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.md,
  },
  popoverLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  popoverDanger: {
    color: colors.loss,
  },
  delete: {
    ...typography.caption,
    color: colors.loss,
    fontWeight: '700',
  },
  desc: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
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


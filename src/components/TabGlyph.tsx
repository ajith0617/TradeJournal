import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useThemedStyles, type ColorPalette} from '../theme';

type TabName = 'Rules' | 'Dashboard' | 'Journal';

type Props = {
  name: TabName;
  focused: boolean;
  color: string;
};

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wrapActive: {
      backgroundColor: colors.accentMuted,
    },
    dashRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      width: 18,
      height: 18,
    },
    bar: {
      width: 3.5,
      borderRadius: 1,
    },
    rulesPad: {
      width: 18,
      height: 18,
      borderWidth: 1.5,
      borderRadius: 3,
      paddingTop: 3,
      paddingHorizontal: 2.5,
      overflow: 'hidden',
    },
    rulesInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginBottom: 2.5,
    },
    rulesDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
    },
    rulesStroke: {
      height: 2,
      width: 10,
      borderRadius: 1,
      opacity: 0.9,
    },
    rulesBadge: {
      position: 'absolute',
      right: 1,
      bottom: 1,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rulesCheckV: {
      width: 3.5,
      height: 2,
      borderLeftWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: colors.bg,
      transform: [{rotate: '-45deg'}, {translateY: -0.5}],
    },
    book: {
      width: 18,
      height: 18,
      borderWidth: 1.5,
      borderRadius: 2,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    bookSpine: {
      width: 3.5,
      opacity: 0.9,
    },
    bookLines: {
      flex: 1,
      paddingHorizontal: 2,
      paddingTop: 3,
      gap: 2.5,
      justifyContent: 'flex-start',
    },
    bookLine: {
      height: 1.5,
      width: 9,
      borderRadius: 1,
      opacity: 0.85,
    },
  });
}

type Styles = ReturnType<typeof createStyles>;

/** Simple geometric tab icons (no icon font dependency). */
export function TabGlyph({name, focused, color}: Props) {
  const styles = useThemedStyles(t => createStyles(t.colors));

  return (
    <View style={[styles.wrap, focused && styles.wrapActive]}>
      {name === 'Dashboard' ? <DashboardIcon color={color} styles={styles} /> : null}
      {name === 'Rules' ? <RulesIcon color={color} styles={styles} /> : null}
      {name === 'Journal' ? <JournalIcon color={color} styles={styles} /> : null}
    </View>
  );
}

function DashboardIcon({color, styles}: {color: string; styles: Styles}) {
  return (
    <View style={styles.dashRow}>
      <View style={[styles.bar, {height: 8, backgroundColor: color}]} />
      <View style={[styles.bar, {height: 14, backgroundColor: color}]} />
      <View style={[styles.bar, {height: 10, backgroundColor: color}]} />
      <View style={[styles.bar, {height: 16, backgroundColor: color}]} />
    </View>
  );
}

/** List pad with check — same 18×18 footprint as other tab icons. */
function RulesIcon({color, styles}: {color: string; styles: Styles}) {
  return (
    <View style={[styles.rulesPad, {borderColor: color}]}>
      <View style={styles.rulesInner}>
        <View style={[styles.rulesDot, {backgroundColor: color}]} />
        <View style={[styles.rulesStroke, {backgroundColor: color}]} />
      </View>
      <View style={styles.rulesInner}>
        <View style={[styles.rulesDot, {backgroundColor: color}]} />
        <View
          style={[styles.rulesStroke, {backgroundColor: color, width: 8}]}
        />
      </View>
      <View style={[styles.rulesBadge, {backgroundColor: color}]}>
        <View style={styles.rulesCheckV} />
      </View>
    </View>
  );
}

function JournalIcon({color, styles}: {color: string; styles: Styles}) {
  return (
    <View style={[styles.book, {borderColor: color}]}>
      <View style={[styles.bookSpine, {backgroundColor: color}]} />
      <View style={styles.bookLines}>
        <View style={[styles.bookLine, {backgroundColor: color}]} />
        <View style={[styles.bookLine, {backgroundColor: color, width: 10}]} />
        <View style={[styles.bookLine, {backgroundColor: color, width: 8}]} />
      </View>
    </View>
  );
}

import React, {useEffect, useRef, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import {
  createNavigatorFactory,
  TabActions,
  TabRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type NavigationProp,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {JournalStack} from './JournalStack';
import {DashboardStack} from './DashboardStack';
import {RulesScreen} from '../screens/Rules/RulesScreen';
import {TabGlyph} from '../components/TabGlyph';
import {useTheme, useThemedStyles} from '../theme';

const TAB_BAR_BASE = 56;
const TAB_BAR_PAD_TOP = 6;

type SwipeTabOptions = {
  title?: string;
  tabBarLabel?: string;
  tabBarIcon?: (props: {focused: boolean; color: string}) => React.ReactNode;
};

type Props = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabOptions,
  Record<string, never>,
  NavigationProp<ParamListBase>
> &
  TabRouterOptions;

type PagerRef = {
  scrollTo: (opts: {x?: number; y?: number; animated?: boolean}) => void;
};

function SwipeTabNavigator({
  id,
  initialRouteName,
  children,
  screenOptions,
  screenListeners,
}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(({colors: c, typography}) =>
    StyleSheet.create({
      root: {
        flex: 1,
        backgroundColor: c.bg,
      },
      pagerHost: {
        flex: 1,
      },
      tabBar: {
        flexDirection: 'row',
        backgroundColor: c.surface,
        borderTopColor: c.borderSubtle,
        borderTopWidth: StyleSheet.hairlineWidth,
        zIndex: 20,
        elevation: 12,
      },
      tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
      },
      tabLabel: {
        ...typography.caption,
        fontSize: 11,
        marginTop: 2,
      },
    }),
  );
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const pagerRef = useRef<PagerRef | null>(null);
  const [pageSize, setPageSize] = useState({width: 0, height: 0});
  const indexRef = useRef(0);
  const scrollingFromTabPress = useRef(false);
  const didInitialPosition = useRef(false);
  const [pagerVisible, setPagerVisible] = useState(false);

  const {state, navigation, descriptors, NavigationContent} =
    useNavigationBuilder<
      TabNavigationState<ParamListBase>,
      TabRouterOptions,
      TabActionHelpers<ParamListBase>,
      SwipeTabOptions,
      Record<string, never>
    >(TabRouter, {
      id,
      children,
      screenOptions,
      screenListeners,
      initialRouteName,
    });

  indexRef.current = state.index;

  const scrollToIndex = (index: number, animated: boolean) => {
    if (pageSize.width <= 0 || !pagerRef.current) {
      return;
    }
    pagerRef.current.scrollTo({
      x: index * pageSize.width,
      y: 0,
      animated,
    });
  };

  useEffect(() => {
    if (pageSize.width <= 0) {
      return;
    }

    // First paint: jump to Dashboard (or current tab) with no animation
    if (!didInitialPosition.current) {
      scrollToIndex(state.index, false);
      didInitialPosition.current = true;
      // Reveal after offset is applied so Rules never flashes
      requestAnimationFrame(() => setPagerVisible(true));
      return;
    }

    if (scrollingFromTabPress.current) {
      scrollingFromTabPress.current = false;
      return;
    }
    scrollToIndex(state.index, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, pageSize.width]);

  const onPagerLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    if (width !== pageSize.width || height !== pageSize.height) {
      didInitialPosition.current = false;
      setPagerVisible(false);
      setPageSize({width, height});
    }
  };

  const onMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (pageSize.width <= 0) {
      return;
    }
    const next = Math.round(e.nativeEvent.contentOffset.x / pageSize.width);
    const route = state.routes[next];
    if (route && next !== indexRef.current) {
      navigation.dispatch(TabActions.jumpTo(route.name));
    }
  };

  const onTabPress = (routeName: string, index: number) => {
    if (index === state.index) {
      return;
    }
    scrollingFromTabPress.current = true;
    scrollToIndex(index, true);
    navigation.dispatch(TabActions.jumpTo(routeName));
  };

  const initialOffsetX = state.index * pageSize.width;

  return (
    <NavigationContent>
      <View style={styles.root}>
        <View style={styles.pagerHost} onLayout={onPagerLayout}>
          {pageSize.width > 0 && pageSize.height > 0 ? (
            <ScrollView
              ref={ref => {
                pagerRef.current = ref as unknown as PagerRef | null;
              }}
              horizontal
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              // Start on Dashboard immediately — don't flash Rules first
              contentOffset={{x: initialOffsetX, y: 0}}
              onMomentumScrollEnd={onMomentumScrollEnd}
              scrollEventThrottle={16}
              style={{
                width: pageSize.width,
                height: pageSize.height,
                opacity: pagerVisible ? 1 : 0,
              }}>
              {state.routes.map((route, index) => {
                const focused = index === state.index;
                return (
                  <View
                    key={route.key}
                    style={{
                      width: pageSize.width,
                      height: pageSize.height,
                    }}
                    pointerEvents={focused ? 'auto' : 'none'}>
                    {descriptors[route.key].render()}
                  </View>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        <View
          style={[
            styles.tabBar,
            {
              height: TAB_BAR_BASE + bottom,
              paddingBottom: bottom,
              paddingTop: TAB_BAR_PAD_TOP,
            },
          ]}
          pointerEvents="box-none">
          {state.routes.map((route, index) => {
            const focused = index === state.index;
            const {options} = descriptors[route.key];
            const color = focused ? colors.accent : colors.textDim;
            const label = String(
              options.tabBarLabel ?? options.title ?? route.name,
            );

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? {selected: true} : {}}
                hitSlop={8}
                onPress={() => onTabPress(route.name, index)}
                style={styles.tabItem}>
                <View pointerEvents="none">
                  {options.tabBarIcon
                    ? options.tabBarIcon({focused, color})
                    : null}
                </View>
                <Text style={[styles.tabLabel, {color}]} pointerEvents="none">
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </NavigationContent>
  );
}

const createSwipeTabNavigator = createNavigatorFactory(SwipeTabNavigator);
const Tab = createSwipeTabNavigator() as ReturnType<
  typeof createSwipeTabNavigator
>;

export function RootTabs() {
  return (
    <Tab.Navigator initialRouteName="DashboardTab">
      <Tab.Screen
        name="RulesTab"
        component={RulesScreen}
        options={{
          title: 'Rules',
          tabBarIcon: ({
            focused,
            color,
          }: {
            focused: boolean;
            color: string;
          }) => <TabGlyph name="Rules" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({
            focused,
            color,
          }: {
            focused: boolean;
            color: string;
          }) => (
            <TabGlyph name="Dashboard" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="JournalTab"
        component={JournalStack}
        options={{
          title: 'Journal',
          tabBarIcon: ({
            focused,
            color,
          }: {
            focused: boolean;
            color: string;
          }) => <TabGlyph name="Journal" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}


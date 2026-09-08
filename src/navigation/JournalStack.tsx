import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {JournalListScreen} from '../screens/Journal/JournalListScreen';
import {TradeFormScreen} from '../screens/Journal/TradeFormScreen';
import {TradeReviewScreen} from '../screens/Journal/TradeReviewScreen';
import {TradeDetailScreen} from '../screens/Journal/TradeDetailScreen';
import {useTheme} from '../theme';
import type {JournalStackParamList} from './types';

const Stack = createNativeStackNavigator<JournalStackParamList>();

export function JournalStack() {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
        animation: 'slide_from_right',
        freezeOnBlur: false,
      }}>
      <Stack.Screen name="JournalList" component={JournalListScreen} />
      <Stack.Screen name="TradeForm" component={TradeFormScreen} />
      <Stack.Screen name="TradeReview" component={TradeReviewScreen} />
      <Stack.Screen name="TradeDetail" component={TradeDetailScreen} />
    </Stack.Navigator>
  );
}

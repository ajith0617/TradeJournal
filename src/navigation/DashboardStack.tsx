import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {DashboardScreen} from '../screens/Dashboard/DashboardScreen';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {useTheme} from '../theme';
import type {DashboardStackParamList} from './types';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardStack() {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
        animation: 'slide_from_right',
        freezeOnBlur: false,
      }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

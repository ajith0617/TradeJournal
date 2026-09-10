import React, {useEffect, useMemo, useState} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import {RootTabs} from './src/navigation/RootTabs';
import {LoginScreen} from './src/screens/Auth/LoginScreen';
import {BiometricLockScreen} from './src/screens/Auth/BiometricLockScreen';
import {RestoreFromFolderScreen} from './src/screens/Auth/RestoreFromFolderScreen';
import {SplashScreen} from './src/screens/Auth/SplashScreen';
import {useJournalStore} from './src/store/journalStore';
import {ThemeProvider, useTheme} from './src/theme';
import {ConfirmProvider} from './src/components/ConfirmProvider';

const MIN_SPLASH_MS = 2600;

function Bootstrap() {
  const hydrated = useJournalStore(s => s.hydrated);
  const restoreAvailable = useJournalStore(s => s.restoreAvailable);
  const signedIn = useJournalStore(s => s.profile.signedIn);
  const fingerprintLockEnabled = useJournalStore(
    s => s.profile.fingerprintLockEnabled !== false,
  );
  const appUnlocked = useJournalStore(s => s.appUnlocked);
  const hydrate = useJournalStore(s => s.hydrate);
  const [splashDone, setSplashDone] = useState(false);
  const {colors, isDark} = useTheme();

  useEffect(() => {
    const started = Date.now();
    void (async () => {
      await hydrate();
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
      setTimeout(() => setSplashDone(true), wait);
    })();
  }, [hydrate]);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.borderSubtle,
        primary: colors.accent,
      },
    };
  }, [colors, isDark]);

  // Fingerprint only after cold start when lock is enabled.
  if (!hydrated || !splashDone) {
    return <SplashScreen />;
  }

  if (restoreAvailable) {
    return <RestoreFromFolderScreen />;
  }

  if (!signedIn) {
    return <LoginScreen />;
  }

  if (!appUnlocked && fingerprintLockEnabled) {
    return <BiometricLockScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootTabs />
    </NavigationContainer>
  );
}

function AppShell() {
  const {colors, isDark} = useTheme();

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.root, {backgroundColor: colors.bg}]}>
        <Bootstrap />
      </View>
    </>
  );
}

function App() {
  const themeId = useJournalStore(s => s.profile.themeId);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider themeId={themeId}>
        <ConfirmProvider>
          <AppShell />
        </ConfirmProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;

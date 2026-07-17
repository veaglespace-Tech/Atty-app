import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Suppress NativeWind v4 strict mode warnings
try {
  configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });
} catch (e) {}

import { StoreProvider } from '@/components/StoreProvider';
import RegistrationDraftLifecycle from "@/components/register/RegistrationDraftLifecycle";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen immediately since we aren't loading fonts yet
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <SafeAreaView style={styles.container}>
          <RegistrationDraftLifecycle />
          <Slot />
        </SafeAreaView>
      </StoreProvider>
    </ThemeProvider>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  }
});
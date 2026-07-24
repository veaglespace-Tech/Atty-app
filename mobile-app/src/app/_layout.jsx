import '../global.css';
import '@/lib/lucide-interop';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, StyleSheet, LogBox, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Suppress NativeWind v4 strict mode warnings
try {
  configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });
} catch (e) {}

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
  'Image: style.resizeMode is deprecated. Please use props.resizeMode.',
]);

import { StoreProvider } from '@/components/StoreProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen immediately since we aren't loading fonts yet
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [colorScheme]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <SafeAreaView style={styles.container}>
          <Slot />
        </SafeAreaView>
      </StoreProvider>
    </ThemeProvider>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  }
});

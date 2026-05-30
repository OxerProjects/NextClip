import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { I18nManager, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Assistant_400Regular, Assistant_600SemiBold, Assistant_700Bold } from '@expo-google-fonts/assistant';
import { Text, TextInput } from 'react-native';

// Optional: Global default font for React Native Text components (helps on iOS/Android without refactoring all components)
interface TextWithDefaultProps extends Text {
  defaultProps?: { style?: any };
}
(Text as unknown as TextWithDefaultProps).defaultProps = (Text as unknown as TextWithDefaultProps).defaultProps || {};
(Text as unknown as TextWithDefaultProps).defaultProps!.style = { fontFamily: 'Assistant_400Regular' };

interface TextInputWithDefaultProps extends TextInput {
  defaultProps?: { style?: any };
}
(TextInput as unknown as TextInputWithDefaultProps).defaultProps = (TextInput as unknown as TextInputWithDefaultProps).defaultProps || {};
(TextInput as unknown as TextInputWithDefaultProps).defaultProps!.style = { fontFamily: 'Assistant_400Regular' };


// Smooth scroll and font on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html { scroll-behavior: smooth; }
  `;
  document.head.appendChild(style);
}

// Force RTL
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch (e) {
  console.log('RTL Error', e);
}

export const unstable_settings = {
  // Ensure that reloading on `/` keeps a back button present.
  initialRouteName: 'index',
};

const CustomTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.background,
    notification: Colors.dark.tint,
  },
};

import { Header } from '@/components/Header';
import { usePathname } from 'expo-router';

export default function RootLayout() {
  const pathname = usePathname();
  const hideHeaderOn = ['/booking'];
  const showHeader = !hideHeaderOn.includes(pathname);

  const [fontsLoaded] = useFonts({
    Assistant_400Regular,
    Assistant_600SemiBold,
    Assistant_700Bold,
  });

  if (!fontsLoaded) {
    return null; // Or a splash screen
  }

  return (
    <ThemeProvider value={CustomTheme}>
      {showHeader && <Header />}
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="specialties" />
        <Stack.Screen name="gallery" />
        <Stack.Screen name="about" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="login" />
        <Stack.Screen name="client-event" />
        <Stack.Screen name="dashboard" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

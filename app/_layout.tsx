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

// Web-only fallback chain: if the bundled Assistant_400Regular webfont ever
// fails to load or gets evicted (a known iOS Safari memory-pressure quirk),
// text falls back to the CDN-loaded 'Assistant' family instead of jumping
// straight to the browser's ugly system default. react-native-web passes
// fontFamily straight through to CSS, so a comma list works on web only —
// native platforms only ever read the first token.
const FONT_FALLBACK = Platform.OS === 'web'
  ? 'Assistant_400Regular, Assistant, "Noto Sans Hebrew", system-ui, sans-serif'
  : 'Assistant_400Regular';

interface TextWithDefaultProps extends Text {
  defaultProps?: { style?: any };
}
(Text as unknown as TextWithDefaultProps).defaultProps = (Text as unknown as TextWithDefaultProps).defaultProps || {};
(Text as unknown as TextWithDefaultProps).defaultProps!.style = { fontFamily: FONT_FALLBACK };

interface TextInputWithDefaultProps extends TextInput {
  defaultProps?: { style?: any };
}
(TextInput as unknown as TextInputWithDefaultProps).defaultProps = (TextInput as unknown as TextInputWithDefaultProps).defaultProps || {};
(TextInput as unknown as TextInputWithDefaultProps).defaultProps!.style = { fontFamily: FONT_FALLBACK };

const LOADER_MIN_MS = 2000;

// Web setup: global CSS + Google Font preload + favicon + loading overlay
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Record start time for minimum loader duration
  (window as any).__ncLoaderStart = Date.now();

  // ── Preload Assistant font via Google Fonts (CSS approach — more reliable on iOS Safari) ──
  if (!document.getElementById('nc-gfont')) {
    // Preconnect
    ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach(href => {
      const l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = href;
      if (href.includes('gstatic')) l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    });
    // Font stylesheet — display=block prevents any fallback flash
    const l = document.createElement('link');
    l.id = 'nc-gfont';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=block';
    document.head.appendChild(l);
  }

  // ── Global CSS ──────────────────────────────────────────────────────────────
  if (!document.getElementById('nc-base-style')) {
    const s = document.createElement('style');
    s.id = 'nc-base-style';
    s.textContent = `
      html {
        scroll-behavior: smooth;
        /* Prevent iOS Safari from auto-scaling fonts on orientation change / zoom */
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }
      /* Force Assistant on every element so iOS never shows system font */
      html, body, * {
        font-family: 'Assistant', system-ui, -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      @keyframes nc-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes nc-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.55; }
      }
      #nc-loader {
        position: fixed; inset: 0; z-index: 9999;
        background: #0F172A;
        display: flex; align-items: center; justify-content: center;
        transition: opacity 0.6s ease;
      }
      #nc-loader.done { opacity: 0; pointer-events: none; }
      #nc-loader svg {
        width: 72px; height: 72px;
        animation: nc-spin 2s linear infinite, nc-pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Favicon ─────────────────────────────────────────────────────────────────
  // Override any existing favicon (e.g. the one Expo injects from app.json)
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    document.head.appendChild(faviconLink);
  }
  faviconLink.rel = 'icon';
  faviconLink.type = 'image/svg+xml';
  faviconLink.href = '/icon.svg';

  // ── Loading overlay ──────────────────────────────────────────────────────────
  const injectLoader = () => {
    if (document.getElementById('nc-loader')) return;
    const div = document.createElement('div');
    div.id = 'nc-loader';
    div.innerHTML = `<svg viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.708 10.8846L21.6838 0.640269C24.2733 1.32322 26.5715 2.5753 28.5782 4.39651C30.585 6.21772 32.0431 8.38041 32.9525 10.8846H15.708ZM10.97 15.153L5.12217 4.90873C6.65882 3.40054 8.44474 2.20537 10.4799 1.32322C12.5151 0.441074 14.7131 0 17.0739 0C17.4438 0 17.8706 0.021627 18.3544 0.0648808C18.8382 0.108135 19.2792 0.157648 19.6776 0.213423L10.97 15.153ZM0.554919 21.3423C0.384181 20.6593 0.248728 19.9622 0.148561 19.2508C0.0483949 18.5393 -0.00111907 17.8137 1.91842e-05 17.0738C1.91842e-05 15.0534 0.327268 13.1469 0.981765 11.3541C1.63626 9.56135 2.56109 7.92511 3.75626 6.44538L12.3786 21.3423H0.554919ZM12.5066 33.5074C9.91708 32.8245 7.61211 31.5724 5.5917 29.7512C3.5713 27.93 2.10579 25.7673 1.19519 23.2631H18.3971L12.5066 33.5074ZM17.0739 34.1477C16.647 34.1477 16.2128 34.1192 15.7711 34.0623C15.3295 34.0054 14.91 33.9485 14.5128 33.8916L23.1778 18.9946L29.0255 29.239C27.4889 30.7471 25.7035 31.9423 23.6695 32.8245C21.6354 33.7066 19.4369 34.1477 17.0739 34.1477ZM30.3915 27.7023L21.7692 12.8054H33.5928C33.7635 13.4883 33.899 14.1855 33.9992 14.8969C34.0993 15.6083 34.1488 16.334 34.1477 17.0738C34.1477 19.0658 33.7994 20.9724 33.1028 22.7936C32.4062 24.6148 31.5024 26.251 30.3915 27.7023Z" fill="#0056DB"/>
    </svg>`;
    document.body.appendChild(div);
  };

  if (document.body) {
    injectLoader();
  } else {
    document.addEventListener('DOMContentLoaded', injectLoader);
  }
}

// Force RTL
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch (e) {
  console.log('RTL Error', e);
}

export const unstable_settings = {
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

  useEffect(() => {
    if (!fontsLoaded) return;
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const elapsed = Date.now() - ((window as any).__ncLoaderStart ?? Date.now());
    const remaining = Math.max(0, LOADER_MIN_MS - elapsed);

    const dismiss = setTimeout(() => {
      const loader = document.getElementById('nc-loader');
      if (!loader) return;
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 700);
    }, remaining);

    return () => clearTimeout(dismiss);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
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
        <Stack.Screen name="service/[id]" options={{ animation: 'fade' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * The app's font stack, in one place.
 *
 * Only families that are actually shipped belong here: 'Assistant' comes from
 * the Google Fonts stylesheet (real 400/600/700 weights), Assistant_400Regular
 * is the copy bundled through expo-font in case the CDN is unreachable, and
 * Noto Sans Hebrew is a last resort that still has Hebrew glyphs. Native only
 * ever reads the first token, so it gets the bundled name.
 */
export const AppFontFamily = Platform.OS === 'web'
  ? 'Assistant, Assistant_400Regular, "Noto Sans Hebrew", system-ui, sans-serif'
  : 'Assistant_400Regular';

const primaryColor = '#0056DB';
const backgroundColor = '#0F172A'; // Deep Navy
const textColor = '#FFFFFF';
const textSecondary = '#CBD5E1';

export const Colors = {
  light: {
    text: textColor,
    background: backgroundColor,
    tint: primaryColor,
    icon: textSecondary,
    tabIconDefault: textSecondary,
    tabIconSelected: primaryColor,
  },
  dark: {
    text: textColor,
    background: backgroundColor,
    tint: primaryColor,
    icon: textSecondary,
    tabIconDefault: textSecondary,
    tabIconSelected: primaryColor,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

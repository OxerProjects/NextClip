import { Colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolate, interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Booth3DInline } from './Booth3D';

const FEATURES = [
  { id: 1, text: 'עמדת סלפי מעץ', icon: 'camera', color: '#FF9800' },
  { id: 2, text: 'מגוון אפקטי AI', icon: 'cpu', color: '#4CAF50' },
  { id: 3, text: 'קבלת תמונות במקום', icon: 'printer', color: '#2196F3' },
  { id: 4, text: 'גלריית תמונות', icon: 'image', color: '#FFEB3B' },
  { id: 5, text: 'שטיח אדום ועמודים', icon: 'star', color: '#F44336' },
  { id: 6, text: 'תמונות בלי הגבלה', icon: 'repeat', color: '#9E9E9E' },
];

function FeatureItem({ item, index, scrollY, isMobile }: { item: any, index: number, scrollY?: SharedValue<number>, isMobile: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    const y = scrollY?.value || 0;
    // Start appearing after the booth zooms out (e.g. from 2800)
    const startY = 2800 + index * 150;
    const endY = startY + 400;

    const opacity = interpolate(y, [startY, endY], [0, 1], Extrapolate.CLAMP);
    const translateX = interpolate(y, [startY, endY], [isMobile ? 0 : 50, 0], Extrapolate.CLAMP);
    const translateY = interpolate(y, [startY, endY], [isMobile ? 80 : 0, 0], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ translateX }, { translateY }]
    };
  });

  const featureBoxStyle = isMobile ? [styles.featureBox, styles.mobileFeatureBox] : styles.featureBox;
  const featureTextStyle = isMobile ? [styles.featureText, styles.mobileFeatureText] : styles.featureText;

  return (
    <Animated.View style={[StyleSheet.flatten(featureBoxStyle), animatedStyle]}>
      <Text style={StyleSheet.flatten(featureTextStyle)}>{item.text}</Text>
      <Feather name={item.icon as any} size={isMobile ? 18 : 24} color={item.color} />
    </Animated.View>
  );
}

function FeaturesHeader({ scrollY, isMobile }: { scrollY?: SharedValue<number>, isMobile: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    const y = scrollY?.value || 0;
    // Appears slightly before or exactly with the first feature item (startY = 2650)
    const startY = 2650;
    const endY = startY + 400;

    const opacity = interpolate(y, [startY, endY], [0, 1], Extrapolate.CLAMP);
    const translateX = interpolate(y, [startY, endY], [isMobile ? 0 : 50, 0], Extrapolate.CLAMP);
    const translateY = interpolate(y, [startY, endY], [isMobile ? 80 : 0, 0], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ translateX }, { translateY }]
    };
  });

  const headerStyle = isMobile ? styles.mobileFeaturesHeader : styles.featuresHeader;
  const headerTextStyle = isMobile ? styles.mobileFeaturesHeaderText : styles.featuresHeaderText;

  return (
    <Animated.View style={[StyleSheet.flatten(headerStyle), animatedStyle]}>
      <Text style={StyleSheet.flatten(headerTextStyle)}>למה לבחור בנו?</Text>
    </Animated.View>
  );
}

export function HeroSection({ scrollY }: { scrollY?: SharedValue<number> }) {
  const { width, height: screenHeight } = useWindowDimensions();
  const isMobile = width < 768;

  const textStyle = useAnimatedStyle(() => {
    const y = scrollY?.value || 0;
    const opacity = interpolate(y, [0, 500], [1, 0], Extrapolate.CLAMP);
    const translateY = interpolate(y, [0, 500], [0, -100], Extrapolate.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const arrowStyle = useAnimatedStyle(() => {
    const y = scrollY?.value || 0;
    const opacity = interpolate(y, [0, 100], [1, 0], Extrapolate.CLAMP);
    return { opacity };
  });

  // 3D model scroll-driven transform style
  const modelStyle = useAnimatedStyle(() => {
    const y = scrollY?.value || 0;

    // On mobile, the 3D model starts shifted down by 220px and rises up to 0px
    const translateY = isMobile
      ? interpolate(y, [0, 1000], [220, 0], Extrapolate.CLAMP)
      : 0;

    return {
      transform: [{ translateY }],
    };
  });

  // Safe style resolutions using StyleSheet.flatten to prevent Radix/React DOM styling crashes
  const containerStyle = isMobile ? [styles.container, styles.mobileContainer] : styles.container;
  const contentStyle = isMobile ? [styles.content, styles.mobileContent] : styles.content;
  const textContainerStyle = isMobile ? [styles.textContainer, styles.mobileTextContainer] : styles.textContainer;
  const titleStyle = isMobile ? [styles.title, styles.mobileTitle] : styles.title;
  const ctaStyle = isMobile ? [styles.ctaButton, styles.mobileCtaButton] : styles.ctaButton;
  const ctaTextStyle = isMobile ? [styles.ctaText, styles.mobileCtaText] : styles.ctaText;
  const featuresContainerStyle = isMobile ? [styles.featuresContainer, styles.mobileFeaturesContainer] : styles.featuresContainer;
  const modelContainerStyle = isMobile ? [styles.modelContainer, styles.mobileModelContainer] : styles.modelContainer;

  return (
    <View style={StyleSheet.flatten(containerStyle)}>
      {/* Background Image - right half, subtle */}
      <Image
        source={require('@/assets/images/hero_bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Gradient: left-to-right - solid bg on left, fades into image on right */}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              // @ts-ignore
              backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 1) 0%, rgba(15, 23, 42, 1) 40%, rgba(15, 23, 42, 0.95) 50%, rgba(15, 23, 42, 0.7) 65%, rgba(15, 23, 42, 0.3) 85%, rgba(15, 23, 42, 0.1) 100%)',
            },
          ]}
        />
      )}

      {/* Gradient: bottom fade - smooth transition to next section */}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              // @ts-ignore
              backgroundImage: 'linear-gradient(to top, rgba(15, 23, 42, 1) 0%, rgba(15, 23, 42, 0.8) 8%, rgba(15, 23, 42, 0) 20%)',
            },
          ]}
        />
      )}

      {/* Gradient: top fade - subtle for header area */}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              // @ts-ignore
              backgroundImage: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0) 10%)',
            },
          ]}
        />
      )}

      {/* Grid Pattern */}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              // @ts-ignore
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
              // @ts-ignore
              backgroundSize: '100px 100px',
            },
          ]}
        />
      )}

      <View style={StyleSheet.flatten(contentStyle)}>
        {/* Right side - Text */}
        <Animated.View style={[StyleSheet.flatten(textContainerStyle), textStyle as any]}>
          <Text style={StyleSheet.flatten(titleStyle)}>
            {isMobile ? 'עמדת הצילום AI לאירוע הבא שלכם' : 'עמדת\nהצילום AI\nלאירוע\nהבא שלכם'}
          </Text>

          <Link href="/booking" asChild>
            <Pressable style={StyleSheet.flatten(ctaStyle)}>
              <Text style={StyleSheet.flatten(ctaTextStyle)}>להזמנות</Text>
            </Pressable>
          </Link>
        </Animated.View>

        {/* Features List (Appears later, rises exactly in the center on Mobile) */}
        <View style={StyleSheet.flatten(featuresContainerStyle)} pointerEvents="none">
          <FeaturesHeader scrollY={scrollY} isMobile={isMobile} />
          {FEATURES.map((item, index) => (
            <FeatureItem key={item.id} item={item} index={index} scrollY={scrollY} isMobile={isMobile} />
          ))}
        </View>

        {/* Left side - 3D Model */}
        <Animated.View style={[StyleSheet.flatten(modelContainerStyle), modelStyle]}>
          <Booth3DInline scrollY={scrollY} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.arrowContainer, arrowStyle as any]}>
        <Feather name="arrow-down" size={32} color="#0056DB" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%' as any,
    height: '100%' as any,
    backgroundColor: Colors.dark.background,
    paddingTop: 80,
    position: 'relative',
    overflow: 'hidden',
  },
  mobileContainer: {
    paddingTop: 60,
  },
  bgImage: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%' as any,
    height: '100%' as any,
    opacity: 0.25,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%' as any,
    maxWidth: 1400,
    paddingHorizontal: 40,
    alignSelf: 'center',
    gap: 40,
  },
  mobileContent: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    gap: 20,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 80,
    zIndex: 10,
    position: 'relative',
  },
  mobileTextContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 110, // Lower it down so it sits slightly above the center of the screen
    paddingBottom: 0,
    gap: 24,
  },
  title: {
    fontSize: 96,
    fontWeight: '900' as const,
    fontFamily: 'Google Sans, sans-serif',
    color: Colors.dark.text,
    textAlign: 'right',
    lineHeight: 96,
  },
  mobileTitle: {
    fontSize: 62,
    lineHeight: 60,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#0056DB',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 8,
    minWidth: 300,
    alignItems: 'center' as const,
  },
  mobileCtaButton: {
    minWidth: '85%' as any,
    paddingVertical: 14,
  },
  ctaText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  mobileCtaText: {
    fontSize: 18,
  },
  featuresContainer: {
    position: 'absolute',
    right: 40,
    top: '20%',
    zIndex: 15,
    gap: 16,
    alignItems: 'flex-end',
  },
  mobileFeaturesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    gap: 12,
    paddingHorizontal: 20,
  },
  featureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 16,
    width: 350,
  },
  mobileFeatureBox: {
    flexDirection: 'row-reverse',
    width: '100%',
    maxWidth: 360, // cap maximum width so it fits beautifully in the center of mobile devices
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  featureText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileFeatureText: {
    fontSize: 15,
  },
  modelContainer: {
    flex: 1.2,
    width: '100%' as any,
    position: 'relative' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  mobileModelContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%' as any,
    height: '100%' as any,
    zIndex: 0,
  },
  arrowContainer: {
    position: 'absolute' as const,
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    zIndex: 20,
  },
  featuresHeader: {
    marginBottom: 20,
    alignItems: 'flex-end',
    width: 350,
  },
  featuresHeaderText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#38bdf8', // Glowing brand light blue highlight
    fontFamily: 'Google Sans, sans-serif',
    textAlign: 'right',
  },
  mobileFeaturesHeader: {
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
  },
  mobileFeaturesHeaderText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff', // Glowing brand light blue highlight
    fontFamily: 'Google Sans, sans-serif',
    textAlign: 'center',
  },
});

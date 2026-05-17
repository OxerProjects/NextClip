import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform, DeviceEventEmitter, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { HeroSection } from '@/components/home/HeroSection';
import { Header } from '@/components/Header';
import { Colors } from '@/constants/theme';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { GalleryMarquee } from '@/components/home/GalleryMarquee';
import { ContactSection } from '@/components/home/ContactSection';
import { Footer } from '@/components/Footer';

const { height: screenHeight } = Dimensions.get('window');

export default function HomeScreen() {
  const scrollY = useSharedValue(0);

  const handleScrollJS = useCallback((y: number) => {
    DeviceEventEmitter.emit('onScroll', y);
  }, []);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    runOnJS(handleScrollJS)(event.contentOffset.y);
  });

  return (
    <View style={styles.container}>
      <Header />

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Sticky Hero - stays on screen while scrolling */}
        <View style={styles.scrollSequence}>
          <View style={styles.stickyContainer}>
            <HeroSection scrollY={scrollY} />
          </View>
        </View>

        {/* Normal scrollable content below the sticky sequence */}
        <View style={styles.contentSection}>
          {/* Ambient Glowing Blobs */}
          <View style={[styles.glowBlob, styles.blueBlob]} pointerEvents="none" />
          <View style={[styles.glowBlob, styles.purpleBlob]} pointerEvents="none" />
          <View style={[styles.glowBlob, styles.cyanBlob]} pointerEvents="none" />

          {/* Immersive Atmospheric Event Background Image */}
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600' }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          </View>

          <TestimonialsSection />
          <GalleryMarquee />
          <ContactSection />
          <Footer />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollSequence: {
    height: 6000, // Increased to give a longer pause after features animate in
  },
  stickyContainer: {
    height: Platform.OS === 'web' ? ('100vh' as any) : screenHeight,
    position: Platform.OS === 'web' ? ('sticky' as any) : ('absolute' as any),
    top: 0,
    width: '100%' as any,
    overflow: 'hidden',
  },
  contentSection: {
    backgroundColor: Colors.dark.background,
    zIndex: 10, // Ensure it sits above any absolute elements if needed
    overflow: 'hidden', // Contain the large blurred glow blobs
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.15,
    pointerEvents: 'none',
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
      },
    }),
  },
  blueBlob: {
    top: '5%',
    left: '-15%',
    width: 600,
    height: 600,
    backgroundColor: '#2563eb', // Blue
  },
  purpleBlob: {
    bottom: '25%',
    right: '-15%',
    width: 700,
    height: 700,
    backgroundColor: '#8b5cf6', // Purple
  },
  cyanBlob: {
    top: '45%',
    right: '25%',
    width: 500,
    height: 500,
    backgroundColor: '#06b6d4', // Cyan
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.035, // extremely subtle so text stays 100% readable!
    zIndex: -1,
    ...Platform.select({
      web: {
        filter: 'grayscale(100%) blur(4px)',
      },
    }),
  },
});

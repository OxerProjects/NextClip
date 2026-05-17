import { Colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [showCta, setShowCta] = useState(!isHome);
  const [isScrolled, setIsScrolled] = useState(!isHome);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Animation values
  const animValue = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Sync header state on page transitions (pathname changes)
  useEffect(() => {
    if (!isHome) {
      setShowCta(true);
      setIsScrolled(true);
    } else {
      // We are on home, check current scroll position to initialize states
      const y = Platform.OS === 'web' ? window.scrollY : 0;
      setShowCta(y > 400);
      setIsScrolled(y > 20);
    }
    // Make sure mobile menu closes on page transition
    setIsMenuOpen(false);
    menuAnim.setValue(0);
  }, [pathname, isHome]);

  // Scroll listeners only active on Home page
  useEffect(() => {
    if (!isHome) return;

    const handleScroll = (scrollY: number) => {
      setShowCta(scrollY > 400);
      setIsScrolled(scrollY > 20);
    };

    const subscription = DeviceEventEmitter.addListener('onScroll', handleScroll);

    let webHandler: () => void;
    if (Platform.OS === 'web') {
      webHandler = () => handleScroll(window.scrollY);
      window.addEventListener('scroll', webHandler);
      // Run once to match current scroll
      handleScroll(window.scrollY);
    }

    return () => {
      subscription.remove();
      if (webHandler && Platform.OS === 'web') {
        window.removeEventListener('scroll', webHandler);
      }
    };
  }, [isHome]);

  // Animate when showCta changes
  useEffect(() => {
    Animated.timing(animValue, {
      toValue: showCta ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [showCta]);

  // Toggle mobile menu drawer animation
  const toggleMenu = (open: boolean) => {
    if (open) {
      setIsMenuOpen(true);
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => {
        setIsMenuOpen(false);
      });
    }
  };

  const ctaFlex = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const ctaOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const navPaddingLeft = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [450, 0],
  });

  // Slide drawer from the right edge
  const menuTranslateX = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isScrolled ? 'rgba(15, 23, 42, 0.65)' : 'transparent',
            borderBottomColor: isScrolled ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            // @ts-ignore
            backdropFilter: isScrolled ? 'blur(20px)' : 'none',
            // @ts-ignore
            WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'none',
          } as any
        ]}
      >
        <View style={StyleSheet.flatten(isMobile ? styles.mobileContent : styles.content)}>
          {isMobile ? (
            // Mobile Header: Hamburger Menu (Left) + Logo (Right)
            <>
              <Pressable style={styles.hamburgerBtn} onPress={() => toggleMenu(true)}>
                <Feather name="menu" size={26} color="#fff" />
              </Pressable>

              <View style={styles.mobileLogoContainer}>
                <Link href="/" asChild>
                  <Pressable style={StyleSheet.flatten(styles.logoContainer)}>
                    <Image
                      source={require('@/assets/images/logo.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </Pressable>
                </Link>
              </View>
            </>
          ) : (
            // Desktop Header (Untouched exactly as before)
            <>
              {/* Right - CTA Button */}
              <Animated.View style={[styles.rightSection, { flex: ctaFlex, opacity: ctaOpacity }]}>
                <Link href="/booking" asChild>
                  <Pressable style={StyleSheet.flatten(styles.ctaButton)}>
                    <Text style={styles.ctaText}>להזמנה</Text>
                  </Pressable>
                </Link>
              </Animated.View>

              {/* Navigation */}
              <Animated.View style={[
                styles.centerSection,
                { paddingLeft: navPaddingLeft },
                !showCta && { justifyContent: 'right' as any },
              ]}>
                <Link href="/specialties" asChild>
                  <Pressable><Text style={styles.navText}>תחומי התמחות</Text></Pressable>
                </Link>
                <Link href="/gallery" asChild>
                  <Pressable><Text style={styles.navText}>גלריה</Text></Pressable>
                </Link>
                <Link href="/about" asChild>
                  <Pressable><Text style={styles.navText}>קצת עלינו</Text></Pressable>
                </Link>
              </Animated.View>

              {/* Left - Logo */}
              <View style={styles.leftSection}>
                <Link href="/" asChild>
                  <Pressable style={StyleSheet.flatten(styles.logoContainer)}>
                    <Image
                      source={require('@/assets/images/logo.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </Pressable>
                </Link>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Premium Mobile Menu Overlay Drawer (Slides in 9/10 width from right, pure black background, with pointing arrow) */}
      {isMobile && isMenuOpen && (
        <Animated.View
          style={[
            StyleSheet.flatten(styles.mobileMenuOverlay),
            { transform: [{ translateX: menuTranslateX }] }
          ]}
        >
          {/* Close button pointing right (arrow-right) */}
          <Pressable style={styles.closeBtn} onPress={() => toggleMenu(false)}>
            <Feather name="arrow-right" size={32} color="#fff" />
          </Pressable>

          {/* Logo (top-right) */}
          <View style={styles.menuLogoContainer}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Menu Links */}
          <View style={styles.menuLinks}>
            <Link href="/specialties" asChild>
              <Pressable onPress={() => toggleMenu(false)}>
                <Text style={styles.menuLinkText}>תחומי התמחות</Text>
              </Pressable>
            </Link>
            <Link href="/gallery" asChild>
              <Pressable onPress={() => toggleMenu(false)}>
                <Text style={styles.menuLinkText}>גלריה</Text>
              </Pressable>
            </Link>
            <Link href="/about" asChild>
              <Pressable onPress={() => toggleMenu(false)}>
                <Text style={styles.menuLinkText}>קצת עלינו</Text>
              </Pressable>
            </Link>
          </View>

          {/* Center CTA Button */}
          <Link href="/booking" asChild>
            <Pressable style={StyleSheet.flatten(styles.menuCtaButton)} onPress={() => toggleMenu(false)}>
              <Text style={styles.menuCtaText}>להזמנה</Text>
            </Pressable>
          </Link>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 40,
    paddingVertical: 16,
    width: '100%' as any,
    maxWidth: 1400,
    alignSelf: 'center' as const,
  },
  mobileContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rightSection: {
    alignItems: 'flex-start' as const,
    overflow: 'hidden' as const,
  },
  centerSection: {
    flex: 2,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 40,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-end' as const,
  },
  navText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '500' as const,
  },
  logoContainer: {
    height: 50,
    width: 150,
  },
  logoImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  ctaButton: {
    backgroundColor: '#0056DB',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  // Mobile styles
  hamburgerBtn: {
    padding: 8,
  },
  mobileLogoContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },
  mobileMenuOverlay: {
    position: Platform.OS === 'web' ? 'fixed' as any : 'absolute',
    top: 0,
    right: 0,
    width: '90%', // 9/10 of the screen width
    bottom: 0,
    height: Platform.OS === 'web' ? '100vh' as any : '100%',
    backgroundColor: '#000000', // Pure Solid Black
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    zIndex: 9999,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center', // Centered vertically in the middle of the screen!
    gap: 32,
    // Soft shadow boundary on the left edge
    shadowColor: '#000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  } as any,
  closeBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 10001,
  },
  menuLogoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    height: 50,
    width: 150,
  },
  menuLinks: {
    gap: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.03)', // Elegant subtle background card
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  menuLinkText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  menuCtaButton: {
    backgroundColor: '#0056DB',
    width: '100%',
    maxWidth: 320, // Match the menuLinks card width
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  menuCtaText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

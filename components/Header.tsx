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
  const isTablet = width >= 768 && width < 1024;

  const [showCta, setShowCta] = useState(!isHome);
  const [isScrolled, setIsScrolled] = useState(!isHome);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  const animValue = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const isServicePage = pathname.startsWith('/service/');
  const activeService = pathname === '/service/1' || pathname === '/service/2' || pathname === '/service/3';

  useEffect(() => {
    if (!isHome) {
      setShowCta(true);
      setIsScrolled(true);
    } else {
      const y = Platform.OS === 'web' ? window.scrollY : 0;
      setShowCta(y > 400);
      setIsScrolled(y > 20);
    }
    setIsMenuOpen(false);
    menuAnim.setValue(0);
    setServicesOpen(false);
  }, [pathname, isHome]);

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
      handleScroll(window.scrollY);
    }

    return () => {
      subscription.remove();
      if (webHandler && Platform.OS === 'web') {
        window.removeEventListener('scroll', webHandler);
      }
    };
  }, [isHome]);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: showCta ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [showCta]);


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
        setMobileServicesOpen(false);
      });
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('header-glass-style')) {
        const style = document.createElement('style');
        style.id = 'header-glass-style';
        style.textContent = `
          .header-glass-active {
            background-color: rgba(15, 23, 42, 0.65) !important;
            border-bottom-color: rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
          }
          .services-dropdown-item:hover {
            background: rgba(59,130,246,0.12) !important;
          }
          .services-menu {
            animation: dropdownIn 0.18s ease forwards;
          }
          @keyframes dropdownIn {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('lightboxOpen', (isOpen: boolean) => {
      setLightboxOpen(isOpen);
    });
    return () => sub.remove();
  }, []);

  const hideHeaderRoutes = ['/login', '/client-event', '/dashboard', '/booking'];
  if (hideHeaderRoutes.includes(pathname) || lightboxOpen) {
    return null;
  }

  const ctaFlex = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const ctaOpacity = animValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const navPaddingLeft = animValue.interpolate({ inputRange: [0, 1], outputRange: [200, 0] });
  const menuTranslateX = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });


  const ServicesDropdown = () => (
    <View
      style={dropdownStyles.wrapper}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: () => setServicesOpen(true),
        onMouseLeave: () => setServicesOpen(false),
      } as any : {})}
    >
      <Pressable
        style={StyleSheet.flatten([dropdownStyles.trigger, activeService ? dropdownStyles.triggerActive : null])}
        onPress={() => setServicesOpen(!servicesOpen)}
      >
        <Text style={StyleSheet.flatten([styles.navText, isTablet ? styles.navTextTablet : null, activeService ? styles.activeNavText : null])}>
          שירותים
        </Text>
        <Feather
          name="chevron-down"
          size={14}
          color={activeService ? '#3b82f6' : 'rgba(255,255,255,0.7)'}
          style={{ marginRight: 2, marginTop: 2 }}
        />
      </Pressable>

      {/* Bridge: fills the gap between trigger and menu so hover doesn't break */}
      {servicesOpen && <View style={dropdownStyles.bridge} />}

      {servicesOpen && (
        <View
          style={dropdownStyles.menu}
          {...(Platform.OS === 'web' ? { className: 'services-menu' } : {})}
        >
          {[
            { href: '/service/2', label: 'עמדת צילום AI', icon: '📸', desc: 'האטרקציה שלא ישכחו' },
            { href: '/service/1', label: 'מגנטים', icon: '🧲', desc: 'מזכרת שנשארת לנצח' },
            { href: '/service/3', label: 'סטילס', icon: '🎞️', desc: 'צילום מקצועי' },
          ].map((item) => (
            <Link key={item.href} href={item.href as any} asChild>
              <Pressable
                style={StyleSheet.flatten([dropdownStyles.item, pathname === item.href ? dropdownStyles.itemActive : null])}
                {...(Platform.OS === 'web' ? { className: 'services-dropdown-item' } : {})}
              >
                <Text style={dropdownStyles.itemIcon}>{item.icon}</Text>
                <View style={dropdownStyles.itemText}>
                  <Text style={StyleSheet.flatten([dropdownStyles.itemLabel, pathname === item.href ? dropdownStyles.itemLabelActive : null])}>
                    {item.label}
                  </Text>
                  <Text style={dropdownStyles.itemDesc}>{item.desc}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <>
      <View
        style={StyleSheet.flatten([
          styles.container,
          {
            backgroundColor: isScrolled ? 'rgba(15, 23, 42, 0.65)' : 'transparent',
            borderBottomColor: isScrolled ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }
        ])}
        {...(Platform.OS === 'web' && isScrolled ? { className: 'header-glass-active' } : {})}
      >
        <View style={StyleSheet.flatten(isMobile ? styles.mobileContent : isTablet ? styles.tabletContent : styles.content)}>
          {isMobile ? (
            <>
              <Pressable style={styles.hamburgerBtn} onPress={() => toggleMenu(true)}>
                <Feather name="menu" size={26} color="#fff" />
              </Pressable>
              <View style={styles.mobileLogoContainer}>
                <Link href="/" asChild>
                  <Pressable style={StyleSheet.flatten(styles.logoContainer)}>
                    <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  </Pressable>
                </Link>
              </View>
            </>
          ) : (
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
                isTablet && styles.centerSectionTablet,
                { paddingLeft: navPaddingLeft },
                !showCta && { justifyContent: 'right' as any },
              ]}>
                <Link href="/" asChild>
                  <Pressable>
                    <Text style={StyleSheet.flatten([styles.navText, isTablet && styles.navTextTablet, pathname === '/' && styles.activeNavText])}>
                      בית
                    </Text>
                  </Pressable>
                </Link>
                <ServicesDropdown />
                <Link href="/gallery" asChild>
                  <Pressable>
                    <Text style={StyleSheet.flatten([styles.navText, isTablet && styles.navTextTablet, pathname === '/gallery' && styles.activeNavText])}>
                      גלריה
                    </Text>
                  </Pressable>
                </Link>
                <Link href="/about" asChild>
                  <Pressable>
                    <Text style={StyleSheet.flatten([styles.navText, isTablet && styles.navTextTablet, pathname === '/about' && styles.activeNavText])}>
                      קצת עלינו
                    </Text>
                  </Pressable>
                </Link>
              </Animated.View>

              {/* Left - Logo */}
              <View style={styles.leftSection}>
                <Link href="/" asChild>
                  <Pressable style={StyleSheet.flatten(styles.logoContainer)}>
                    <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  </Pressable>
                </Link>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Mobile Menu Drawer */}
      {isMobile && isMenuOpen && (
        <Animated.View
          style={[
            StyleSheet.flatten(styles.mobileMenuOverlay),
            { transform: [{ translateX: menuTranslateX }] }
          ]}
        >
          <Pressable style={styles.closeBtn} onPress={() => toggleMenu(false)}>
            <Feather name="arrow-right" size={32} color="#fff" />
          </Pressable>

          <View style={styles.menuLogoContainer}>
            <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>

          <View style={styles.menuLinks}>
            <Link href="/" asChild>
              <Pressable onPress={() => toggleMenu(false)}>
                <Text style={StyleSheet.flatten([styles.menuLinkText, pathname === '/' && styles.activeMenuLinkText])}>בית</Text>
              </Pressable>
            </Link>

            {/* Mobile Services Accordion */}
            <Pressable onPress={() => setMobileServicesOpen(!mobileServicesOpen)}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <Text style={StyleSheet.flatten([styles.menuLinkText, activeService && styles.activeMenuLinkText])}>שירותים</Text>
                <Feather name={mobileServicesOpen ? 'chevron-up' : 'chevron-down'} size={22} color={activeService ? '#3b82f6' : '#fff'} />
              </View>
            </Pressable>

            {mobileServicesOpen && (
              <View style={mobileStyles.servicesAccordion}>
                {[
                  { href: '/service/2', label: 'עמדת צילום AI' },
                  { href: '/service/1', label: 'מגנטים' },
                  { href: '/service/3', label: 'סטילס' },
                ].map((item) => (
                  <Link key={item.href} href={item.href as any} asChild>
                    <Pressable onPress={() => toggleMenu(false)} style={mobileStyles.accordionItem}>
                      <Text style={StyleSheet.flatten([mobileStyles.accordionText, pathname === item.href ? { color: '#3b82f6' } : null])}>
                        {item.label}
                      </Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}

            <Link href="/gallery" asChild>
              <Pressable onPress={() => toggleMenu(false)}>
                <Text style={StyleSheet.flatten([styles.menuLinkText, pathname === '/gallery' && styles.activeMenuLinkText])}>גלריה</Text>
              </Pressable>
            </Link>
            <Link href="/about" asChild>
              <Pressable onPress={() => toggleMenu(false)}>
                <Text style={StyleSheet.flatten([styles.menuLinkText, pathname === '/about' && styles.activeMenuLinkText])}>קצת עלינו</Text>
              </Pressable>
            </Link>
          </View>

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

const dropdownStyles = StyleSheet.create({
  wrapper: {
    position: 'relative' as any,
    zIndex: 2000,
  },
  trigger: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  triggerActive: {},
  bridge: {
    position: 'absolute' as any,
    top: '100%' as any,
    right: 0,
    width: '100%',
    height: 10,
  },
  menu: {
    position: 'absolute' as any,
    top: '100%' as any,
    right: 0,
    marginTop: 10,
    backgroundColor: 'rgba(10, 16, 35, 0.97)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 240,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)' } as any,
    }),
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    margin: 4,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  itemActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  itemIcon: {
    fontSize: 22,
  },
  itemText: {
    alignItems: 'flex-end',
    flex: 1,
  },
  itemLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  itemLabelActive: {
    color: '#3b82f6',
  },
  itemDesc: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
});

const mobileStyles = StyleSheet.create({
  servicesAccordion: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accordionItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  accordionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});

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
  tabletContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    gap: 24,
  },
  centerSectionTablet: {
    gap: 20,
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
  navTextTablet: {
    fontSize: 15,
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
    width: '90%',
    bottom: 0,
    height: Platform.OS === 'web' ? '100vh' as any : '100%',
    backgroundColor: '#000000',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    zIndex: 9999,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    maxWidth: 320,
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
  activeNavText: {
    color: '#3b82f6',
    fontWeight: '700' as const,
  },
  activeMenuLinkText: {
    color: '#3b82f6',
  },
});

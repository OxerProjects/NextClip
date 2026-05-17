import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const MARQUEE_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600', // Wedding couple
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600', // Elegant event hall
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600', // Party crowd lights
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600', // Festival dj crowd
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600', // Club dancing lights
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600', // Premium camera gear
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=600', // Celebrate sparks
  'https://images.unsplash.com/photo-1507504038482-76210f6c315a?q=80&w=600', // Happy friends dance
];

export function GalleryMarquee() {
  useEffect(() => {
    // Inject and force update CSS styles to prevent browser/bundler caching
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let style = document.getElementById('gallery-marquee-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'gallery-marquee-style';
        document.head.appendChild(style);
      }
      style.textContent = `
        @keyframes marquee-scroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-track {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          white-space: nowrap !important;
          width: max-content !important;
          animation: marquee-scroll 24s linear infinite !important;
        }
        .marquee-track:hover {
          animation-play-state: paused !important;
        }
      `;
    }
  }, []);

  // 2x Duplication is mathematically perfect when flex-wrap is locked to nowrap
  const items = [...MARQUEE_IMAGES, ...MARQUEE_IMAGES];

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>רגעים מהשטח</Text>
        <Text style={styles.subtitle}>ככה זה נראה כשהכיף מתחיל. תמונות חיות מהאירועים של NextClip</Text>

        {/* Pure HTML container with direction: 'ltr' to force LTR and align overflow cards on the right */}
        <div style={webStyles.marqueeContainer}>
          <div className="marquee-track">
            {items.map((url, idx) => (
              <div key={idx} style={webStyles.card}>
                <img src={url} alt="Gallery Shot" style={webStyles.image} />
              </div>
            ))}
          </div>

          {/* Left Fade Gradient Mask */}
          <div style={webStyles.fadeLeft} />
        </div>
      </View>
    );
  }

  // Native Mobile fallback using horizontal ScrollView
  return (
    <View style={styles.container}>
      <Text style={styles.title}>רגעים מהשטח</Text>
      <Text style={styles.subtitle}>ככה זה נראה כשהכיף מתחיל. תמונות חיות מהאירועים של NextClip</Text>

      <View style={styles.marqueeContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileTrack}
        >
          {MARQUEE_IMAGES.map((url, idx) => (
            <View key={idx} style={styles.card}>
              <Image source={{ uri: url }} style={styles.image} />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 50,
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 15,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    maxWidth: 600,
  },
  marqueeContainer: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    height: 240,
  },
  mobileTrack: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    width: 320,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#111827',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

const webStyles = {
  marqueeContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    height: '240px',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    userSelect: 'none',
    direction: 'ltr', // FORCE LTR LAYOUT SO SCROLLING FLOWS FROM RIGHT-TO-LEFT SEAMLESSLY!
  } as any,
  card: {
    width: '320px',
    height: '220px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: '#111827',
    marginRight: '20px',
    flexShrink: 0,
    display: 'inline-block',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'pointer',
  } as any,
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    userSelect: 'none',
    pointerEvents: 'none',
  } as any,
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '120px',
    zIndex: 2,
    background: 'linear-gradient(to right, rgba(15, 23, 42, 1), rgba(15, 23, 42, 0))',
    pointerEvents: 'none',
  } as any,
};

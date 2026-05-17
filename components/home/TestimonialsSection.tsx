import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View, Platform, Animated, useWindowDimensions } from 'react-native';

const TESTIMONIALS = [
  { id: 1, name: 'רועי כהן', text: 'פשוט חוויה מדהימה! האורחים בחתונה לא הפסיקו להצטלם והאיכות פסיכית.', rating: 5, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
  { id: 2, name: 'נועה לוי', text: 'האיכות של התמונות מושלמת. שירות מעל ומעבר, צוות מקצועי שעזר בכל שאלה.', rating: 5, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
  { id: 3, name: 'שירן דהן', text: 'ממליצה בחום! העמדה נראית פרימיום ומוסיפה המון לכל אירוע.', rating: 5, avatar: 'https://i.pravatar.cc/150?u=a04258a2462d826712d' },
  { id: 4, name: 'דניאל אברהם', text: 'שירות מצוין, הגיעו בזמן והכל תקתק כמו שעון. חוויה מעולה.', rating: 4, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c' },
  { id: 5, name: 'אביב גולן', text: 'היה מדהים, כולם עפו על העמדה. מזכרת מושלמת לאורחים שלנו.', rating: 5, avatar: 'https://i.pravatar.cc/150?u=a048581f4e29026701d' },
];

function TestimonialCard({ item, index, isMobile }: { item: any, index: number, isMobile: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const viewRef = useRef<View>(null);

  useEffect(() => {
    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000 + (index % 3) * 300, // Offset durations so they float out of sync
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000 + (index % 3) * 300,
          useNativeDriver: Platform.OS !== 'web',
        })
      ])
    ).start();

    // Scroll reveal animation (fade in from bottom)
    if (Platform.OS === 'web' && typeof IntersectionObserver !== 'undefined') {
      const node = viewRef.current as any;
      if (node) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: false,
              }).start();
              observer.disconnect();
            }
          },
          { threshold: 0.1 }
        );
        observer.observe(node);
        return () => observer.disconnect();
      }
    } else {
      // Fallback if not web or no observer
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: index * 200,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  // Alternating alignment: Evens on the left, odds on the right (in LTR terms)
  const alignSelf = isMobile ? 'center' : (index % 2 === 0 ? 'flex-start' : 'flex-end');

  return (
    <Animated.View 
      ref={viewRef}
      style={[
        styles.cardContainer, 
        { alignSelf, width: isMobile ? '100%' : '60%' },
        { opacity: fadeAnim, transform: [{ translateY: translateY }, { translateY: floatY }] }
      ]}
    >
      <View style={styles.card}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{item.name}</Text>
        
        <View style={styles.stars}>
          {[...Array(5)].map((_, i) => (
            <FontAwesome
              key={i}
              name={i < item.rating ? 'star' : 'star-o'}
              size={16}
              color="#FFD700"
              style={styles.star}
            />
          ))}
        </View>

        <Text style={styles.text} numberOfLines={4}>"{item.text}"</Text>
      </View>
    </Animated.View>
  );
}

export function TestimonialsSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ממליצים עלינו</Text>
      
      <View style={styles.listContainer}>
        {TESTIMONIALS.map((item, index) => (
          <TestimonialCard key={item.id} item={item} index={index} isMobile={isMobile} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    backgroundColor: 'transparent',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 60,
    textAlign: 'center',
  },
  listContainer: {
    width: '100%',
    maxWidth: 1000,
    paddingHorizontal: 20,
    flexDirection: 'column',
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 30, // Space between stacked cards
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    paddingTop: 50,
    marginTop: 40, // Space for the absolute avatar
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
    top: -40,
    borderWidth: 4,
    borderColor: '#0F172A', // Deep Navy background color matching Colors.dark.background
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row-reverse',
    gap: 4,
    marginBottom: 16,
    justifyContent: 'center',
  },
  star: {
    marginHorizontal: 1,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  }
});

import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

// images: תמונות קטנות שצפות מסביב לכרטיס.
// שים את הקבצים ב-public/ ופשוט הוסף את שמותיהם כאן.
// ניתן להוסיף 1-4 תמונות לכל ביקורת.
const TESTIMONIALS = [
  { id: 1, name: 'ורד - מנהלת מחוז דרום ב"כללית"', text: 'היה מהמם! שמעתי הרבה מחמאות על העמדה וכל התמונות שצילמת יצאו מדהימות.', rating: 5, avatar: 'clalit.jpg', images: [] },
  { id: 2, name: 'עומרי - חברת "INTEL"', text: 'היה מדהים! כל הכבוד על העבודה המושלמת, כולם נהנו מאוד.', rating: 5, avatar: 'intel.png', images: [] },
  { id: 3, name: 'מעיין - מנהלת HR בחברת "PLAYTIKA"', text: 'היי היה מעולה, לא יכולה לחכות לשלוח לכולם את התמונות.', rating: 5, avatar: 'playtika.png', images: [] },
  { id: 4, name: 'רונית', text: 'בוקר טוב עידו, תודה רבה על אתמול אתה פשוט מקסים ואין דברים כמוך. אין ספק שהעמדה עשתה את הבת מצווה!!! נהיננו מאוד הצטלמנו מלאאאא כמו שאתה יודע, השארנו אותך בלי מגנטים. הייתם מדהימים. המון המון תודה‼️', rating: 5, avatar: 'anon.jpg', images: [] },
  { id: 5, name: 'ליאורה - עמותת "להושיט יד"', text: 'תודה רבה רבה רבה על אתמול!! עשיתם ליהונתן ובכללי לכולם ערב מושלם! לפי יהונתן ״הערב הכי טוב שהיה לי בחיים!״ אין עליכם!!!!', rating: 5, avatar: 'yad.png', images: ['lev.jpeg'] },
  { id: 6, name: 'יצחק ונופך', text: 'עידו ❤️ חייב לכתוב לכם אחרי התאוששות ואוו !!! שמע כמה פרגונים על העמדה אנשים אהבו את זה ברמות, לקחו ממני מספר ויותר מהעמדה פירגנו לכם על העבודה על הסבלנות על הנעימות שלכם!! זה מה זה לא מובן מאליו שמע אנחנו שמחים רצח על הבחירה 🤍', rating: 5, avatar: 'wedding.jpg', images: [] },
  { id: 7, name: 'מיטל - עמותת "ואהבת"', text: 'היי עידו, רצינו להגיד תודה רבה על האירוע אתמול, העמדה הייתה מדהימה החיילים והמשפחות נהנו מאוד, התמונות יצאו מעולות ומגניבות, והיחס שלך היה פשוט מקסים. תודה על ההשקעה, הסבלנות והלב שהבאת איתך לאירוע ❤️', rating: 5, avatar: 'aavta.png', images: [] },
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

  const alignSelf = isMobile ? 'center' : (index % 2 === 0 ? 'flex-start' : 'flex-end');
  const hasImages = item.images && item.images.length > 0;

  // Positions for up to 4 floating images around the card.
  // Each entry: [top%, left%, rotate(deg), scale]
  const floatPositions = [
    { top: '-18%', left: '-14%',  rotate: '-8deg',  scale: 1    },
    { top: '55%',  left: '-16%',  rotate: '6deg',   scale: 0.88 },
    { top: '-18%', right: '-14%', rotate: '8deg',   scale: 0.92 },
    { top: '55%',  right: '-16%', rotate: '-5deg',  scale: 0.85 },
  ];

  return (
    <Animated.View
      ref={viewRef}
      style={[
        styles.cardContainer,
        { alignSelf, width: isMobile ? '100%' : '60%' },
        // Extra horizontal padding when images are present so they don't clip
        hasImages && !isMobile ? { marginHorizontal: 80 } : null,
        { opacity: fadeAnim, transform: [{ translateY: translateY }, { translateY: floatY }] },
      ]}
    >
      {/* Floating event photos */}
      {hasImages && !isMobile && Platform.OS === 'web' && item.images.map((uri: string, i: number) => {
        const pos = floatPositions[i % floatPositions.length];
        return (
          <View
            key={i}
            style={[
              styles.floatPhoto,
              {
                top: pos.top as any,
                left: (pos as any).left ?? undefined,
                right: (pos as any).right ?? undefined,
                transform: [{ rotate: pos.rotate }, { scale: pos.scale }],
              },
            ]}
          >
            <Image source={{ uri }} style={styles.floatPhotoImg} resizeMode="cover" />
          </View>
        );
      })}

      <View style={styles.card}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{item.name}</Text>

        <View style={styles.stars}>
          {[...Array(5)].map((_, i) => (
            <FontAwesome key={i} name={i < item.rating ? 'star' : 'star-o'} size={16} color="#FFD700" style={styles.star} />
          ))}
        </View>

        <Text style={styles.text} numberOfLines={4}>"{item.text}"</Text>

        {/* Mobile: small inline photo row instead of floating */}
        {hasImages && isMobile && (
          <View style={styles.mobilePhotoRow}>
            {item.images.slice(0, 3).map((uri: string, i: number) => (
              <Image key={i} source={{ uri }} style={styles.mobilePhoto} resizeMode="cover" />
            ))}
          </View>
        )}
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
  },
  // Floating photo (desktop) — positioned absolutely outside the card
  floatPhoto: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 0,
  },
  floatPhotoImg: {
    width: '100%' as any,
    height: '100%' as any,
  },
  // Mobile inline photo strip
  mobilePhotoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  mobilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

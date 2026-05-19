import { Colors } from '@/constants/theme';
import { ClientEvent, getClientEvents } from '@/utils/storage';
import { Feather } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, Modal } from 'react-native';

export default function ClientEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<ClientEvent | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | 'never'>(0);

  // Selection Mode States
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Lightbox Modal States
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  useEffect(() => {
    loadEventData();
  }, [id]);

  const loadEventData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const events = await getClientEvents();
      const found = events.find(e => e.id === id);

      if (found) {
        setEvent(found);

        // Calculate days remaining
        if (found.duration === 'never') {
          setDaysRemaining('never');
        } else {
          const daysLimit = parseInt(found.duration, 10);
          const createdTime = new Date(found.createdAt).getTime();
          const limitTime = createdTime + (daysLimit * 24 * 60 * 60 * 1000);
          const diffMs = limitTime - Date.now();
          const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

          setDaysRemaining(diffDays > 0 ? diffDays : 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Single Image Downloader (Safe for mobile web and desktop)
  const triggerDownloadSingle = (uri: string, filename: string) => {
    if (Platform.OS === 'web') {
      const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobileWeb) {
        // Mobile browsers cannot force cross-origin downloads direct clicks; open in new tab instead
        window.open(uri, '_blank');
      } else {
        // Desktop browsers can safely perform direct HTML5 download trigger
        const link = document.createElement('a');
        link.href = uri;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      alert('הורדה ישירה נתמכת בדפדפן בלבד!');
    }
  };

  // Multiple Images Downloader with sequential timing
  const triggerDownloadMultiple = (uris: string[]) => {
    if (uris.length === 0) return;

    if (Platform.OS === 'web') {
      const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      uris.forEach((uri, idx) => {
        setTimeout(() => {
          if (isMobileWeb) {
            window.open(uri, '_blank');
          } else {
            const link = document.createElement('a');
            link.href = uri;
            link.download = `nextclip_event_image_${idx + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }, idx * 450); // 450ms delay between downloads on desktop/mobile prevents blockages
      });
    } else {
      alert('הורדה קבוצתית נתמכת בדפדפן בלבד!');
    }
  };

  const toggleSelectImage = (uri: string) => {
    if (selectedImages.includes(uri)) {
      setSelectedImages(selectedImages.filter(u => u !== uri));
    } else {
      setSelectedImages([...selectedImages, uri]);
    }
  };

  // Lightbox Navigation Handlers
  const handlePrevImage = () => {
    if (!event || !previewImageUri) return;
    const idx = event.images.indexOf(previewImageUri);
    if (idx > 0) {
      setPreviewImageUri(event.images[idx - 1]);
    } else {
      setPreviewImageUri(event.images[event.images.length - 1]); // Loop to end
    }
  };

  const handleNextImage = () => {
    if (!event || !previewImageUri) return;
    const idx = event.images.indexOf(previewImageUri);
    if (idx < event.images.length - 1) {
      setPreviewImageUri(event.images[idx + 1]);
    } else {
      setPreviewImageUri(event.images[0]); // Loop to start
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0056DB" />
        <Text style={styles.loadingText}>טוען את החומרים מהאירוע שלכם...</Text>
      </View>
    );
  }

  if (!event || (daysRemaining !== 'never' && daysRemaining <= 0)) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-triangle" size={60} color="#ef4444" style={{ marginBottom: 20 }} />
        <Text style={styles.errorTitle}>האירוע לא נמצא או פג תוקף</Text>
        <Text style={styles.errorText}>גלריית האירוע נסגרה או שהקוד שהוזן אינו תקין. לבירורים נוספים אנא פנו למנהל האירוע שלכם.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/login')}>
          <Text style={styles.backBtnText}>חזרה להתחברות</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Private Banner */}
        <View style={StyleSheet.flatten([styles.banner, isMobile && styles.mobileBanner])}>
          {/* Logo on the top left */}
          <Link href="/" asChild>
            <Pressable style={StyleSheet.flatten([styles.topLogoBtn, isMobile && styles.mobileTopLogoBtn])}>
              <Image source={require('@/assets/images/logo.png')} style={styles.topLogo} resizeMode="contain" />
            </Pressable>
          </Link>

          {/* Logout on the top right */}
          <Pressable
            style={StyleSheet.flatten([styles.logoutBtn, isMobile && styles.mobileLogoutBtn])}
            onPress={() => router.replace('/login')}
          >
            <Feather name="log-out" size={16} color="#ef4444" />
            <Text style={styles.logoutText}>יציאה</Text>
          </Pressable>

          <Text style={styles.eventLabel}>גלריית האירוע הפרטית שלכם</Text>
          <Text style={StyleSheet.flatten([styles.eventName, isMobile && styles.mobileEventName])}>{event.name}</Text>

          {/* Metadata Badges */}
          <View style={StyleSheet.flatten([styles.metaRow, isMobile && styles.mobileMetaRow])}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{event.date}</Text>
              <Feather name="calendar" size={14} color="#94a3b8" style={{ marginLeft: 6 }} />
            </View>

            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{event.images.length} תמונות</Text>
              <Feather name="image" size={14} color="#94a3b8" style={{ marginLeft: 6 }} />
            </View>

            <View style={StyleSheet.flatten([
              styles.metaBadge,
              daysRemaining !== 'never' && daysRemaining <= 7 ? styles.warningBadge : null
            ])}>
              <Text style={[
                styles.metaBadgeText,
                daysRemaining !== 'never' && daysRemaining <= 7 ? styles.warningBadgeText : null
              ]}>
                {daysRemaining === 'never' ? 'גלריה פתוחה לתמיד' : `נשארו עוד ${daysRemaining} ימים להורדה`}
              </Text>
              <Feather name="clock" size={14} color={daysRemaining !== 'never' && daysRemaining <= 7 ? '#ef4444' : '#94a3b8'} style={{ marginLeft: 6 }} />
            </View>
          </View>

          {/* Banner Actions Row - Toggles Multi-selection Mode */}
          <View style={StyleSheet.flatten([styles.bannerActionsRow, isMobile && styles.mobileBannerActionsRow])}>
            {isSelectMode ? (
              <>
                <Pressable
                  style={StyleSheet.flatten([
                    styles.downloadSelectedBtn,
                    selectedImages.length === 0 && styles.disabledSelectedBtn,
                    isMobile && styles.mobileActionBtn
                  ])}
                  onPress={() => triggerDownloadMultiple(selectedImages)}
                  disabled={selectedImages.length === 0}
                >
                  <Text style={styles.downloadAllText}>הורד בחירה ({selectedImages.length})</Text>
                  <Feather name="download" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </Pressable>

                <Pressable
                  style={StyleSheet.flatten([styles.cancelSelectBtn, isMobile && styles.mobileActionBtn])}
                  onPress={() => {
                    setIsSelectMode(false);
                    setSelectedImages([]);
                  }}
                >
                  <Text style={styles.cancelSelectText}>ביטול בחירה</Text>
                  <Feather name="x" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={StyleSheet.flatten([styles.downloadAllBtn, isMobile && styles.mobileActionBtn])}
                  onPress={() => triggerDownloadMultiple(event.images)}
                >
                  <Text style={styles.downloadAllText}>הורד את כל התמונות</Text>
                  <Feather name="download-cloud" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </Pressable>

                <Pressable
                  style={StyleSheet.flatten([styles.selectModeBtn, isMobile && styles.mobileActionBtn])}
                  onPress={() => setIsSelectMode(true)}
                >
                  <Text style={styles.selectModeText}>בחר תמונות</Text>
                  <Feather name="check-square" size={18} color="#cbd5e1" style={{ marginLeft: 8 }} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Private Grid */}
        <View style={StyleSheet.flatten([styles.gridContainer, isMobile && styles.mobileGridContainer])}>
          {event.images.length === 0 ? (
            <View style={styles.emptyGallery}>
              <Feather name="camera-off" size={40} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>עדיין לא הועלו תמונות לאוונט זה. אנא נסה שוב מאוחר יותר.</Text>
            </View>
          ) : (
            <View style={styles.imageGrid}>
              {event.images.map((imgUri, idx) => {
                const isSelected = selectedImages.includes(imgUri);
                return (
                  <Pressable
                    key={idx}
                    style={StyleSheet.flatten([
                      styles.gridCard,
                      isMobile && styles.mobileGridCard,
                      isSelected && styles.gridCardSelected
                    ])}
                    onPress={() => {
                      if (isSelectMode) {
                        toggleSelectImage(imgUri);
                      } else {
                        setPreviewImageUri(imgUri);
                      }
                    }}
                  >
                    <Image source={{ uri: imgUri }} style={styles.gridImage} resizeMode="cover" />

                    {isSelectMode ? (
                      // Multi-selection checkbox indicator
                      <View style={styles.checkboxOverlay}>
                        <View style={isSelected ? styles.checkboxSelected : styles.checkboxUnselected}>
                          {isSelected && <Feather name="check" size={12} color="#fff" />}
                        </View>
                      </View>
                    ) : (
                      // Centered Glassmorphic zoom and download controls
                      <View style={styles.imageOverlay}>
                        <View style={styles.overlayBtnRow}>
                          <Pressable
                            style={styles.imageActionBtn}
                            onPress={() => setPreviewImageUri(imgUri)}
                          >
                            <Feather name="maximize-2" size={16} color="#fff" />
                          </Pressable>

                          <Pressable
                            style={styles.imageActionBtn}
                            onPress={() => triggerDownloadSingle(imgUri, `nextclip_event_image_${idx + 1}.jpg`)}
                          >
                            <Feather name="download" size={16} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Lightbox / Zoom-in Modal Overlay (Uses Portal rendering to bypass Stack transition CSS transform blocks on mobile browsers) */}
      <Modal
        visible={!!previewImageUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <View style={styles.lightboxOverlay}>
          {/* Top Actions Panel */}
          <View style={styles.lightboxTopBar}>
            <Pressable 
              style={styles.lightboxActionBtn} 
              onPress={() => triggerDownloadSingle(previewImageUri!, 'nextclip_preview.jpg')}
            >
              <Text style={styles.lightboxBtnText}>הורדה</Text>
              <Feather name="download" size={20} color="#fff" style={{ marginLeft: 6 }} />
            </Pressable>
            
            <Pressable style={styles.lightboxCloseBtn} onPress={() => setPreviewImageUri(null)}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Centered Image with Navigation arrows */}
          <View style={styles.lightboxMainArea}>
            {/* Left/Prev Arrow */}
            <Pressable style={styles.navArrowBtn} onPress={handlePrevImage}>
              <Feather name="chevron-left" size={28} color="#fff" />
            </Pressable>

            {previewImageUri && (
              <Image source={{ uri: previewImageUri }} style={styles.lightboxImage} resizeMode="contain" />
            )}

            {/* Right/Next Arrow */}
            <Pressable style={styles.navArrowBtn} onPress={handleNextImage}>
              <Feather name="chevron-right" size={28} color="#fff" />
            </Pressable>
          </View>
          {/* Page Counter & Mobile Hint */}
          <View style={styles.lightboxBottomBar}>
            {event && previewImageUri && (
              <Text style={styles.lightboxCounter}>
                {event.images.indexOf(previewImageUri) + 1} / {event.images.length}
              </Text>
            )}
            {Platform.OS === 'web' && (
              <Text style={styles.mobileHintText}>
                * בטלפון: ניתן ללחוץ לחיצה ארוכה על התמונה כדי לשמור אותה ישירות לגלריה
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Google Sans, sans-serif',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Google Sans, sans-serif',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 500,
    marginBottom: 32,
    fontFamily: 'Google Sans, sans-serif',
  },
  backBtn: {
    backgroundColor: '#0056DB',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  banner: {
    paddingTop: 100, // Reduced since global header is hidden
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    position: 'relative',
  },
  mobileBanner: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  topLogoBtn: {
    position: 'absolute',
    top: 30,
    left: 40,
    zIndex: 10,
  },
  mobileTopLogoBtn: {
    top: 20,
    left: 20,
  },
  topLogo: {
    width: 110,
    height: 40,
  },
  logoutBtn: {
    position: 'absolute',
    top: 30,
    right: 40,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  mobileLogoutBtn: {
    top: 20,
    right: 20,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'Google Sans, sans-serif',
    textTransform: 'uppercase',
    marginTop: 20,
  },
  eventName: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileEventName: {
    fontSize: 30,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  mobileMetaRow: {
    flexDirection: 'column',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  metaBadgeText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: 'Google Sans, sans-serif',
  },
  warningBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  warningBadgeText: {
    color: '#f87171',
    fontWeight: 'bold',
  },

  // Banner Actions Row
  bannerActionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  mobileBannerActionsRow: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  mobileActionBtn: {
    width: '100%',
    justifyContent: 'center',
  },
  downloadAllBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#0056DB',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  downloadAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  selectModeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  selectModeText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  downloadSelectedBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#10b981', // Elegant Emerald Green for action selection
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  disabledSelectedBtn: {
    backgroundColor: '#10b981',
    opacity: 0.4,
  },
  cancelSelectBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelSelectText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },

  gridContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingTop: 48,
  },
  mobileGridContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  emptyGallery: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Google Sans, sans-serif',
  },
  imageGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  gridCard: {
    width: '31%',
    aspectRatio: 1.2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  gridCardSelected: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    transform: [{ scale: 0.98 }] as any,
  },
  mobileGridCard: {
    width: '100%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },

  // Selection Checkbox styles
  checkboxOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
  },
  checkboxUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  checkboxSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Centered controls on hover
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    opacity: Platform.OS === 'web' ? 0 : 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Lightbox / Modal preview styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 5, 10, 0.99)', // 99% premium deeply blackened background
    justifyContent: 'space-between',
    paddingVertical: 32,
    direction: 'rtl',
  },
  lightboxBottomBar: {
    alignItems: 'center',
    gap: 8,
  },
  mobileHintText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'Google Sans, sans-serif',
  },
  lightboxTopBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  lightboxActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#0056DB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  lightboxBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  lightboxCloseBtn: {
    padding: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lightboxMainArea: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    width: '100%',
  },
  navArrowBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lightboxImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    maxWidth: '85%',
    maxHeight: '80%',
  },
  lightboxCounter: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
});

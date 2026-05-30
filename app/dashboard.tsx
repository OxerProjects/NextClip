import { Colors } from '@/constants/theme';
import { ClientEvent, deleteClientEvent, deleteGalleryImage, GalleryImage, getClientEvents, getGalleryImages, saveClientEvent, saveGalleryImage, getLeads, getBookings, ContactLead, BookingLead, saveBooking } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

type ActiveTab = 'clients' | 'gallery' | 'calendar' | 'leads';

export default function DashboardPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 480;

  const [activeTab, setActiveTab] = useState<ActiveTab>('clients');

  // --- CLIENT EVENTS STATES ---
  const [clientEvents, setClientEvents] = useState<ClientEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Event form fields
  const [eventName, setEventName] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDuration, setEventDuration] = useState<'30' | '60' | '90' | 'never'>('30');
  const [eventImages, setEventImages] = useState<string[]>([]);

  // Web drag and drop states for event images
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<any>(null);

  // --- PUBLIC GALLERY STATES ---
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [galleryCategory, setGalleryCategory] = useState('#חתונה');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoriesList, setCategoriesList] = useState(['#חתונה', '#בר מצווה', '#בת מצווה', '#אירוע חברה']);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // --- CALENDAR STATES ---
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [realBookings, setRealBookings] = useState<BookingLead[]>([]);
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [newBookingTitle, setNewBookingTitle] = useState('');
  const [newBookingTime, setNewBookingTime] = useState('');
  const [dbTokenMissing, setDbTokenMissing] = useState(false);

  // --- CALENDAR HELPERS ---
  const hebrewMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const currentMonthLabel = `${hebrewMonths[calMonth]} ${calYear}`;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0=Sun(א)

  const handlePrevMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };
  const handleNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const formatDStr = (day: number) =>
    `${calYear}-${(calMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  useEffect(() => {
    const checkAuth = async () => {
      const isAdmin = await AsyncStorage.getItem('@nextclip_admin_session');
      if (isAdmin !== 'true') {
        router.replace('/login');
      } else {
        loadAllData();
      }
    };
    checkAuth();
  }, []);

  // Native HTML5 Drag and Drop event listener attachments to completely bypass React Native's Responder system blockages on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !showEventForm) return;

    // Small delay to ensure the DOM node is rendered and attached
    const timer = setTimeout(() => {
      const el = dropZoneRef.current;
      if (!el) return;

      const domNode = el.getScrollableNode ? el.getScrollableNode() : el;
      if (!domNode) return;

      const preventDefault = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };

      const handleDragIn = (e: DragEvent) => {
        preventDefault(e);
        setIsDragging(true);
      };

      const handleDragOut = (e: DragEvent) => {
        preventDefault(e);
        setIsDragging(false);
      };

      const handleDropFile = (e: DragEvent) => {
        preventDefault(e);
        setIsDragging(false);
        const files = e.dataTransfer?.files;
        if (files) {
          Array.from(files).forEach((file: File) => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (event: any) => {
                if (event.target?.result) {
                  setEventImages(prev => [...prev, event.target.result]);
                }
              };
              reader.readAsDataURL(file);
            }
          });
        }
      };

      domNode.addEventListener('dragenter', handleDragIn);
      domNode.addEventListener('dragover', preventDefault);
      domNode.addEventListener('dragleave', handleDragOut);
      domNode.addEventListener('drop', handleDropFile);

      return () => {
        domNode.removeEventListener('dragenter', handleDragIn);
        domNode.removeEventListener('dragover', preventDefault);
        domNode.removeEventListener('dragleave', handleDragOut);
        domNode.removeEventListener('drop', handleDropFile);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [showEventForm]);

  const loadAllData = async () => {
    // Check if the Vercel Blob is configured
    if (Platform.OS === 'web') {
      try {
        const apiUrl = `${window.location.origin}/api/nextclip-db`;
        const res = await fetch(apiUrl);
        if (res.status === 500) {
          const data = await res.json();
          if (data?.error && data.error.includes('BLOB_READ_WRITE_TOKEN')) {
            setDbTokenMissing(true);
          }
        }
      } catch (e) {
        console.warn('Failed to check API status:', e);
      }
    }

    const pubImages = await getGalleryImages();
    setGalleryImages(pubImages);

    // Dynamically extract unique categories from actual images
    const existingCats = new Set(['#חתונה', '#בר מצווה', '#בת מצווה', '#אירוע חברה']);
    pubImages.forEach(img => {
      if (img.category) {
        existingCats.add(img.category);
      }
    });
    setCategoriesList(Array.from(existingCats));

    const events = await getClientEvents();
    setClientEvents(events);

    const dbLeads = await getLeads();
    setLeads(dbLeads);

    const dbBookings = await getBookings();
    setRealBookings(dbBookings);
  };

  // --- CLIENT EVENT HANDLERS ---
  const handleAddEventClick = () => {
    setEditingEventId(null);
    setEventName('');
    setEventCode('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventDuration('30');
    setEventImages([]);
    setShowEventForm(true);
  };

  const handleEditEventClick = (ev: ClientEvent) => {
    setEditingEventId(ev.id);
    setEventName(ev.name);
    setEventCode(ev.code);
    setEventDate(ev.date);
    setEventDuration(ev.duration);
    setEventImages(ev.images || []);
    setShowEventForm(true);
  };

  const handleDeleteEventClick = async (id: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('האם אתה בטוח שברצונך למחוק אירוע זה?')
      : true; // Bypass RN prompt for simple web testing

    if (confirmDelete) {
      await deleteClientEvent(id);
      loadAllData();
    }
  };

  const handleDeleteGalleryClick = async (id: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('האם אתה בטוח שברצונך למחוק תמונה זו מהגלריה הציבורית?')
      : true;

    if (confirmDelete) {
      const updated = await deleteGalleryImage(id);
      setGalleryImages(updated);
    }
  };

  const handleAddNewCategory = () => {
    let cleanCat = newCategoryText.trim();
    if (!cleanCat) return;
    
    if (!cleanCat.startsWith('#')) {
      cleanCat = '#' + cleanCat;
    }

    if (!categoriesList.includes(cleanCat)) {
      setCategoriesList(prev => [...prev, cleanCat]);
    }
    
    setGalleryCategory(cleanCat);
    setNewCategoryText('');
    setShowCategoryDropdown(false);
  };

  const pickEventImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map(asset => asset.uri);
      setEventImages(prev => [...prev, ...uris]);
    }
  };

  const handleSaveEvent = async () => {
    if (!eventName.trim() || !eventCode.trim() || !eventDate.trim()) {
      alert('אנא מלא את כל שדות החובה');
      return;
    }

    await saveClientEvent({
      id: editingEventId || undefined,
      name: eventName,
      code: eventCode,
      date: eventDate,
      duration: eventDuration,
      images: eventImages,
    });

    setShowEventForm(false);
    loadAllData();
  };

  // --- PUBLIC GALLERY HANDLERS ---
  const pickGalleryImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      setImageWidth(result.assets[0].width);
      setImageHeight(result.assets[0].height);
    }
  };

  const handleUploadGallery = async () => {
    if (!selectedImage) return;
    setIsUploading(true);

    const MAX_DIM = 600;
    let w = imageWidth || 400;
    let h = imageHeight || 400;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = (h / w) * MAX_DIM;
        w = MAX_DIM;
      } else {
        w = (w / h) * MAX_DIM;
        h = MAX_DIM;
      }
    }

    await saveGalleryImage({
      uri: selectedImage,
      category: galleryCategory,
      width: w,
      height: h,
    });

    setSelectedImage(null);
    setGalleryCategory('#חתונה');
    setIsUploading(false);
    loadAllData();
  };

  // --- CALENDAR HANDLERS ---
  const handleAddBooking = async () => {
    if (!selectedDay || !newBookingTitle.trim() || !newBookingTime.trim()) {
      alert('אנא מלא את כל פרטי האירוע');
      return;
    }
    await saveBooking({
      dateStr: formatDStr(selectedDay),
      name: newBookingTitle.trim(),
      phone: '', email: '', eventType: 'ידני', notes: '',
      startTime: newBookingTime.trim(), endTime: '', guests: 0,
      services: [], totalPrice: 0, status: 'confirmed'
    });
    setNewBookingTitle('');
    setNewBookingTime('');
    loadAllData();
  };

  const handleBlockDate = async () => {
    if (!selectedDay) return;
    await saveBooking({
      dateStr: formatDStr(selectedDay),
      name: 'חסום', phone: '', email: '', eventType: 'חסום',
      notes: '', startTime: '', endTime: '', guests: 0,
      services: [], totalPrice: 0, status: 'blocked'
    });
    loadAllData();
  };

  const handleUnblockDate = async (b: BookingLead) => {
    await saveBooking({ ...b, status: 'pending' });
    loadAllData();
  };

  const handleUpdateBookingStatus = async (b: BookingLead, newStatus: string) => {
    await saveBooking({ ...b, status: newStatus as any });
    loadAllData();
  };

  return (
    <View style={styles.container}>
      {/* Dashboard Top Header */}
      <View style={StyleSheet.flatten([styles.header, isMobile && styles.mobileHeader])}>
        {/* LEFT SIDE: Logo (Bulletproof redirection using direct onPress router) */}
        {/* RIGHT SIDE: Title and Back to site button */}
        <View style={StyleSheet.flatten([styles.headerRight, isMobile && styles.mobileHeaderRight])}>
          <Pressable style={styles.backBtn} onPress={() => router.push('/gallery')}>
            <Feather name="arrow-left" size={16} color="#94a3b8" style={{ marginLeft: 6 }} />
            <Text style={styles.backLinkText}>חזרה לאתר</Text>
          </Pressable>
          <Text style={StyleSheet.flatten([styles.title, isMobile && styles.mobileTitle])}>לוח בקרה</Text>
          {/* Direct onPress bypasses Expo Link cloning bugs on web browsers */}
        </View>
        <Pressable onPress={() => router.push('/')}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        </Pressable>
      </View>

      {dbTokenMissing && (
        <View style={styles.warningBanner}>
          <Feather name="alert-circle" size={18} color="#ef4444" style={{ marginLeft: 8 }} />
          <Text style={styles.warningBannerText}>
            שים לב: משתנה הסביבה <Text style={{ fontWeight: 'bold' }}>BLOB_READ_WRITE_TOKEN</Text> אינו מוגדר ב-Vercel. האירועים והתמונות יישמרו בדפדפן המקומי שלך בלבד ולא יהיו זמינים לאורחים במכשירים אחרים. אנא הגדר את משתנה הסביבה בהגדרות הפרויקט ב-Vercel כדי להפעיל סנכרון ענן מלא.
          </Text>
        </View>
      )}

      {/* Tabs Switcher */}
      <View style={StyleSheet.flatten([styles.tabsContainer, isMobile && styles.mobileTabsContainer])}>
        {([
          { key: 'clients', label: 'ניהול דפי לקוח', icon: 'users' },
          { key: 'gallery', label: 'גלריה ציבורית', icon: 'image' },
          { key: 'calendar', label: 'יומן אירועים', icon: 'calendar' },
          { key: 'leads', label: 'לידים והזמנות', icon: 'bell' },
        ] as const).map(tab => (
          <Pressable
            key={tab.key}
            style={StyleSheet.flatten([
              styles.tabBtn,
              isMobile && styles.mobileTabBtn,
              isSmallMobile && styles.smallMobileTabBtn,
              activeTab === tab.key && styles.activeTabBtn
            ])}
            onPress={() => setActiveTab(tab.key)}
          >
            {!isSmallMobile && (
              <Text style={[
                styles.tabBtnText,
                isMobile && styles.mobileTabBtnText,
                activeTab === tab.key && styles.activeTabBtnText
              ]}>
                {tab.label}
              </Text>
            )}
            <Feather
              name={tab.icon}
              size={isSmallMobile ? 18 : isMobile ? 14 : 18}
              color={activeTab === tab.key ? '#fff' : '#94a3b8'}
              style={!isSmallMobile ? { marginLeft: 6 } : undefined}
            />
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>

        {/* ================= TAB 1: CLIENTS MANAGEMENT ================= */}
        {activeTab === 'clients' && (
          <View style={StyleSheet.flatten([styles.tabContent, isMobile && styles.mobileTabContent])}>
            {!showEventForm ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Pressable style={styles.addEventBtn} onPress={handleAddEventClick}>
                    <Feather name="plus" size={16} color="#fff" style={{ marginLeft: 6 }} />
                    <Text style={styles.addEventBtnText}>הוסף דף חדש</Text>
                  </Pressable>
                  <Text style={styles.sectionMainTitle}>דפי אירועים פתוחים</Text>
                </View>

                {clientEvents.length === 0 ? (
                  <Text style={styles.emptyText}>אין דפי לקוח פתוחים במערכת</Text>
                ) : isMobile ? (
                  // Fully Responsive Client Cards for Mobile (fixes overflow completely!)
                  <View style={styles.mobileCardsList}>
                    {clientEvents.map((ev) => {
                      let days = 'never';
                      if (ev.duration !== 'never') {
                        const daysLimit = parseInt(ev.duration, 10);
                        const createdTime = new Date(ev.createdAt).getTime();
                        const limitTime = createdTime + (daysLimit * 24 * 60 * 60 * 1000);
                        const diffDays = Math.ceil((limitTime - Date.now()) / (24 * 60 * 60 * 1000));
                        days = diffDays > 0 ? `${diffDays} ימים` : 'פג תוקף';
                      } else {
                        days = 'פתוח לתמיד';
                      }

                      return (
                        <View key={ev.id} style={styles.mobileClientCard}>
                          <View style={styles.cardHeaderRow}>
                            <Text style={styles.mobileCardName}>{ev.name}</Text>
                            <View style={styles.mobileCardActions}>
                              <Pressable style={styles.actionBtnEdit} onPress={() => handleEditEventClick(ev)}>
                                <Feather name="edit-2" size={14} color="#3b82f6" />
                              </Pressable>
                              <Pressable style={styles.actionBtnDelete} onPress={() => handleDeleteEventClick(ev.id)}>
                                <Feather name="trash-2" size={14} color="#ef4444" />
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.cardDetailRow}>
                            <Text style={styles.detailLabel}>קוד גישה:</Text>
                            <Text style={styles.detailValueCode}>{ev.code}</Text>
                          </View>

                          <View style={styles.cardDetailRow}>
                            <Text style={styles.detailLabel}>תוקף:</Text>
                            <Text style={styles.detailValue}>{days}</Text>
                          </View>

                          <View style={styles.cardDetailRow}>
                            <Text style={styles.detailLabel}>תאריך האירוע:</Text>
                            <Text style={styles.detailValue}>{ev.date}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  // Desktop Table View
                  <View style={styles.tableWrapper}>
                    {/* Header Row */}
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHCol, { flex: 2 }]}>שם האירוע</Text>
                      <Text style={[styles.tableHCol, { flex: 1 }]}>קוד גישה</Text>
                      <Text style={[styles.tableHCol, { flex: 1.5 }]}>תוקף (ימים שנותרו)</Text>
                      <Text style={[styles.tableHCol, { flex: 1.2, textAlign: 'center' }]}>פעולות</Text>
                    </View>

                    {/* Table Body Rows */}
                    {clientEvents.map((ev) => {
                      let days = 'never';
                      if (ev.duration !== 'never') {
                        const daysLimit = parseInt(ev.duration, 10);
                        const createdTime = new Date(ev.createdAt).getTime();
                        const limitTime = createdTime + (daysLimit * 24 * 60 * 60 * 1000);
                        const diffDays = Math.ceil((limitTime - Date.now()) / (24 * 60 * 60 * 1000));
                        days = diffDays > 0 ? `${diffDays} ימים` : 'פג תוקף';
                      } else {
                        days = 'פתוח לתמיד';
                      }

                      return (
                        <View key={ev.id} style={styles.tableRow}>
                          <Text style={[styles.tableCol, { flex: 2, fontWeight: 'bold' }]}>{ev.name}</Text>
                          <Text style={[styles.tableCol, { flex: 1, color: '#3b82f6' }]}>{ev.code}</Text>
                          <Text style={[styles.tableCol, { flex: 1.5 }]}>{days}</Text>
                          <View style={[styles.actionsCol, { flex: 1.2 }]}>
                            <Pressable style={styles.actionBtnEdit} onPress={() => handleEditEventClick(ev)}>
                              <Feather name="edit-2" size={14} color="#3b82f6" />
                            </Pressable>
                            <Pressable style={styles.actionBtnDelete} onPress={() => handleDeleteEventClick(ev.id)}>
                              <Feather name="trash-2" size={14} color="#ef4444" />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            ) : (
              // Event Addition / Editing Form
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {editingEventId ? 'עריכת דף אירוע' : 'הוספת דף אירוע חדש'}
                  </Text>
                  <Pressable style={styles.formCloseBtn} onPress={() => setShowEventForm(false)}>
                    <Feather name="x" size={20} color="#fff" />
                  </Pressable>
                </View>

                {/* Event Name */}
                <Text style={styles.label}>שם האירוע (חובה)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="לדוגמה: החתונה של יובל ועדי"
                  placeholderTextColor="#64748b"
                  value={eventName}
                  onChangeText={setEventName}
                />

                {/* Access Code */}
                <Text style={styles.label}>קוד גישה לאורחים (חובה)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="ניתן להשתמש במספרים ואותיות"
                  placeholderTextColor="#64748b"
                  value={eventCode}
                  onChangeText={setEventCode}
                />

                {/* Date */}
                <Text style={styles.label}>תאריך האירוע (חובה)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                  value={eventDate}
                  onChangeText={setEventDate}
                />

                {/* Duration dropdown representation */}
                <Text style={styles.label}>תוקף גלריה להורדה</Text>
                <View style={styles.durationSelector}>
                  {(['30', '60', '90', 'never'] as const).map((dur) => (
                    <Pressable
                      key={dur}
                      style={[
                        styles.durBtn,
                        eventDuration === dur && styles.activeDurBtn
                      ]}
                      onPress={() => setEventDuration(dur)}
                    >
                      <Text style={[
                        styles.durBtnText,
                        eventDuration === dur && styles.activeDurBtnText
                      ]}>
                        {dur === 'never' ? 'ללא הגבלה' : `${dur} ימים`}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Premium Drag and Drop File Dropper Area with Native Event Binding */}
                <Text style={styles.label}>העלאת תמונות וחומרים לאירוע ({eventImages.length})</Text>

                {/* Ref bound view wrapper to handle HTML5 native drag and drop events properly on web */}
                <View ref={dropZoneRef} style={{ width: '100%' }}>
                  <Pressable
                    onPress={pickEventImages}
                    style={StyleSheet.flatten([
                      styles.dragDropZone,
                      isDragging && styles.dragDropZoneActive
                    ])}
                  >
                    <Feather name="upload-cloud" size={32} color={isDragging ? '#3b82f6' : '#64748b'} style={{ marginBottom: 8 }} />
                    <Text style={styles.dragDropText}>
                      {isDragging ? 'שחרר את התמונות כאן!' : 'גרור תמונות לכאן או לחץ לבחירה'}
                    </Text>
                  </Pressable>
                </View>

                {/* Mini Images previews (wraps up to 2 rows and scrolls vertically if needed) */}
                {eventImages.length > 0 && (
                  <ScrollView
                    style={styles.previewsContainer}
                    contentContainerStyle={styles.previewsContentContainer}
                    showsVerticalScrollIndicator={true}
                  >
                    {eventImages.map((uri, idx) => (
                      <View key={idx} style={styles.miniPreviewCard}>
                        <Image source={{ uri }} style={styles.miniPreviewImg} />
                        <Pressable
                          style={styles.miniPreviewDelete}
                          onPress={() => setEventImages(eventImages.filter((_, i) => i !== idx))}
                        >
                          <Feather name="x" size={10} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Action buttons */}
                <View style={styles.formActions}>
                  <Pressable style={styles.saveFormBtn} onPress={handleSaveEvent}>
                    <Text style={styles.saveFormBtnText}>שמור שינויים</Text>
                  </Pressable>
                  <Pressable style={styles.cancelFormBtn} onPress={() => setShowEventForm(false)}>
                    <Text style={styles.cancelFormBtnText}>ביטול</Text>
                  </Pressable>
                </View>

              </View>
            )}
          </View>
        )}

        {/* ================= TAB 2: PUBLIC GALLERY ================= */}
        {activeTab === 'gallery' && (
          <View style={StyleSheet.flatten([styles.tabContent, isMobile && styles.mobileTabContent])}>
            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>העלאת תמונה חדשה לגלריה הציבורית</Text>

              <TouchableOpacity style={styles.imagePicker} onPress={pickGalleryImage}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Feather name="upload-cloud" size={40} color="#64748b" style={{ marginBottom: 12 }} />
                    <Text style={styles.pickerText}>לחץ או גרור לבחירת קובץ תמונה</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>קטגוריית גלריה ציבורית (בחר או הוסף חדשה)</Text>
              <View style={{ position: 'relative', width: '100%', zIndex: 9999 }}>
                <Pressable 
                  style={styles.dropdownTrigger}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={styles.dropdownTriggerText}>{galleryCategory}</Text>
                  <Feather name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
                </Pressable>

                {showCategoryDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView 
                      style={{ maxHeight: 180 }}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {categoriesList.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[
                            styles.dropdownItem,
                            galleryCategory === cat && styles.dropdownItemActive
                          ]}
                          onPress={() => {
                            setGalleryCategory(cat);
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            galleryCategory === cat && styles.dropdownItemTextActive
                          ]}>
                            {cat}
                          </Text>
                          {galleryCategory === cat && (
                            <Feather name="check" size={14} color="#3b82f6" />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>

                    {/* Add Custom Category Row */}
                    <View style={styles.dropdownInputRow}>
                      <TextInput
                        style={styles.dropdownNewInput}
                        value={newCategoryText}
                        onChangeText={setNewCategoryText}
                        placeholder="קטגוריה חדשה..."
                        placeholderTextColor="#64748b"
                        onSubmitEditing={handleAddNewCategory}
                      />
                      <Pressable 
                        style={styles.dropdownAddBtn}
                        onPress={handleAddNewCategory}
                      >
                        <Feather name="plus" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.uploadBtn, (!selectedImage || isUploading) && styles.uploadBtnDisabled]}
                onPress={handleUploadGallery}
                disabled={!selectedImage || isUploading}
              >
                <Text style={styles.uploadBtnText}>{isUploading ? 'מעלה קובץ...' : 'העלה לגלריה הציבורית'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>תמונות בגלריה הציבורית ({galleryImages.length})</Text>
              <View style={styles.grid}>
                {galleryImages.map(img => (
                  <View key={img.id} style={StyleSheet.flatten([styles.gridItem, isMobile && styles.mobileGridItem])}>
                    <Image source={{ uri: img.uri }} style={styles.gridImage} />
                    <Text style={styles.gridCat}>{img.category}</Text>
                    
                    <Pressable
                      style={styles.galleryDeleteBtn}
                      onPress={() => handleDeleteGalleryClick(img.id)}
                    >
                      <Feather name="trash-2" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 3: CALENDAR ================= */}
        {activeTab === 'calendar' && (
          <View style={StyleSheet.flatten([styles.tabContent, isMobile && styles.mobileTabContent])}>
            <Text style={styles.sectionMainTitle}>יומן הזמנות ולוח אירועים</Text>
            <Text style={styles.sectionSubtitle}>צפייה בלוח השנה וניהול שריון תאריכים עבור NextClip</Text>

            <View style={StyleSheet.flatten([styles.calendarLayout, isMobile && styles.mobileCalendarLayout])}>

              {/* Calendar grid view */}
              <View style={StyleSheet.flatten([styles.calendarCard, isMobile && styles.mobileCalendarCard])}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarMonthText}>{currentMonthLabel}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable onPress={handleNextMonth} style={{ padding: 4 }}>
                      <Feather name="chevron-left" size={20} color="#fff" />
                    </Pressable>
                    <Pressable onPress={handlePrevMonth} style={{ padding: 4 }}>
                      <Feather name="chevron-right" size={20} color="#fff" />
                    </Pressable>
                  </View>
                </View>

                {/* Day headers */}
                <View style={styles.calendarDaysRow}>
                  {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
                    <Text key={d} style={styles.calendarDayHeaderCell}>{d}</Text>
                  ))}
                </View>

                {/* Calendar grid */}
                <View style={styles.calendarGrid}>
                  {/* Empty offset cells to align day 1 to correct weekday */}
                  {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <View key={`empty-${i}`} style={styles.calendarDayCell} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dStr = formatDStr(dayNum);
                    const dayBookings = realBookings.filter(b => b.dateStr === dStr);
                    const hasEvents = dayBookings.length > 0;
                    const isBlocked = dayBookings.some(b => b.status === 'blocked');
                    const isConfirmed = dayBookings.some(b => b.status === 'confirmed');
                    return (
                      <Pressable
                        key={dayNum}
                        style={[
                          styles.calendarDayCell,
                          selectedDay === dayNum && styles.selectedDayCell,
                          isBlocked && styles.blockedDayCell,
                          isConfirmed && !isBlocked && styles.eventDayCell,
                          hasEvents && !isBlocked && !isConfirmed && styles.eventDayCell
                        ]}
                        onPress={() => setSelectedDay(dayNum)}
                      >
                        <Text style={[
                          styles.calendarDayNumText,
                          selectedDay === dayNum && styles.selectedDayNumText,
                          isBlocked && styles.blockedDayNumText,
                          (isConfirmed || hasEvents) && !isBlocked && styles.eventDayNumText
                        ]}>
                          {dayNum}
                        </Text>
                        {isBlocked && <View style={styles.blockedDot} />}
                        {hasEvents && !isBlocked && <View style={styles.calendarDot} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Bookings panel */}
              <View style={styles.bookingsPanel}>
                <Text style={styles.bookingsPanelTitle}>אירועים ליום {selectedDay} ב{hebrewMonths[calMonth]}:</Text>

                {(() => {
                  if (!selectedDay) return <Text style={styles.emptyBookingsText}>בחר יום מהיומן</Text>;
                  const dStr = formatDStr(selectedDay);
                  const dayBookings = realBookings.filter(b => b.dateStr === dStr);
                  const isDateBlocked = dayBookings.some(b => b.status === 'blocked');
                  return (
                    <>
                      {dayBookings.length === 0 ? (
                        <Text style={styles.emptyBookingsText}>אין אירועים משוריינים ליום זה</Text>
                      ) : (
                        dayBookings.map((b, idx) => (
                          <View key={b.id || idx} style={styles.bookingItem}>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                              <Text style={styles.bookingItemTitle}>{b.name} - {b.eventType} ({b.status === 'blocked' ? 'חסום' : b.status === 'confirmed' ? 'מאושר' : 'ממתין'})</Text>
                              {b.startTime ? <Text style={styles.bookingItemTime}>{b.startTime}{b.phone ? ` - ${b.phone}` : ''}</Text> : null}
                              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                                {b.status !== 'confirmed' && (
                                  <TouchableOpacity onPress={() => handleUpdateBookingStatus(b, 'confirmed')}><Text style={{color: '#10b981', fontWeight: 'bold'}}>אשר אירוע</Text></TouchableOpacity>
                                )}
                                {b.status !== 'blocked' && (
                                  <TouchableOpacity onPress={() => handleUpdateBookingStatus(b, 'blocked')}><Text style={{color: '#f43f5e', fontWeight: 'bold'}}>חסום תאריך</Text></TouchableOpacity>
                                )}
                                {b.status === 'blocked' && (
                                  <TouchableOpacity onPress={() => handleUnblockDate(b)}><Text style={{color: '#f59e0b', fontWeight: 'bold'}}>בטל חסימה</Text></TouchableOpacity>
                                )}
                                {b.status !== 'pending' && b.status !== 'blocked' && (
                                  <TouchableOpacity onPress={() => handleUpdateBookingStatus(b, 'pending')}><Text style={{color: '#9ca3af', fontWeight: 'bold'}}>הפוך לממתין</Text></TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Feather name="clock" size={16} color={b.status === 'blocked' ? '#f43f5e' : b.status === 'confirmed' ? '#10b981' : '#3b82f6'} style={{ marginRight: 12 }} />
                          </View>
                        ))
                      )}

                      {/* Quick block / unblock button */}
                      {!isDateBlocked ? (
                        <Pressable style={styles.blockDateBtn} onPress={handleBlockDate}>
                          <Feather name="lock" size={14} color="#fff" style={{ marginLeft: 6 }} />
                          <Text style={styles.blockDateBtnText}>חסום תאריך זה</Text>
                        </Pressable>
                      ) : null}

                      {/* Add new booking */}
                      <View style={styles.addBookingBox}>
                        <Text style={styles.addBookingTitle}>שריין אירוע חדש ליום זה</Text>

                        <TextInput
                          style={styles.addBookingInput}
                          placeholder="שם האירוע / המזמין"
                          placeholderTextColor="#64748b"
                          value={newBookingTitle}
                          onChangeText={setNewBookingTitle}
                        />

                        <TextInput
                          style={styles.addBookingInput}
                          placeholder="שעה (לדוגמה: 19:00)"
                          placeholderTextColor="#64748b"
                          value={newBookingTime}
                          onChangeText={setNewBookingTime}
                        />

                        <Pressable style={styles.addBookingBtn} onPress={handleAddBooking}>
                          <Text style={styles.addBookingBtnText}>שריין תאריך במערכת</Text>
                        </Pressable>
                      </View>
                    </>
                  );
                })()}
              </View>

            </View>
          </View>
        )}

        {/* ================= TAB 4: LEADS ================= */}
        {activeTab === 'leads' && (
          <View style={StyleSheet.flatten([styles.tabContent, isMobile && styles.mobileTabContent])}>
            <Text style={styles.sectionMainTitle}>לידים מצור קשר</Text>
            {leads.length === 0 ? (
              <Text style={styles.emptyText}>אין לידים חדשים</Text>
            ) : (
              leads.map(lead => (
                <View key={lead.id} style={styles.bookingItem}>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.bookingItemTitle}>{lead.name} | {lead.phone}</Text>
                    <Text style={styles.bookingItemTime}>{lead.email}</Text>
                    <Text style={styles.bookingItemTime}>{lead.message}</Text>
                    <Text style={{color: '#9ca3af', fontSize: 10, marginTop: 4}}>{new Date(lead.date).toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    ...(Platform.OS === 'web' ? {
      height: '100vh' as any,
      maxHeight: '100vh' as any,
      overflow: 'hidden' as any,
      display: 'flex' as any,
      flexDirection: 'column' as any,
    } : {}),
  },
  header: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  mobileHeader: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileTitle: {
    fontSize: 16,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 20,
  },
  mobileHeaderRight: {
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  backLinkText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  logo: {
    width: 100,
    height: 36,
  },
  tabsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    gap: 16,
  },
  mobileTabsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'nowrap',
    paddingHorizontal: 8,
    gap: 6,
    justifyContent: 'center',
  },
  tabBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  mobileTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallMobileTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileTabBtnText: {
    fontSize: 12,
  },
  activeTabBtn: {
    backgroundColor: '#0056DB',
    borderColor: '#0056DB',
  },
  activeTabBtnText: {
    color: '#fff',
  },
  scrollBody: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      overflow: 'auto' as any,
      height: '100%' as any,
    } : {}),
  },
  scrollContent: {
    paddingBottom: 80,
  },
  tabContent: {
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 40,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  mobileTabContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  sectionMainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Google Sans, sans-serif',
    textAlign: 'right',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'right',
    marginBottom: 28,
  },
  addEventBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#0056DB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addEventBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 60,
  },
  tableWrapper: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  tableHCol: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tableCol: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'right',
  },
  actionsCol: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtnEdit: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDelete: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Responsive Mobile client card list styles
  mobileCardsList: {
    gap: 16,
    width: '100%',
  },
  mobileClientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    direction: 'rtl',
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 12,
    marginBottom: 12,
    width: '100%',
  },
  mobileCardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cardDetailRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  detailValue: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  detailValueCode: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Form card
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
    width: '100%',
    direction: 'rtl',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  formCloseBtn: {
    padding: 4,
  },
  label: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#fff',
    padding: 12,
    textAlign: 'right',
    marginBottom: 20,
  },
  durationSelector: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  durBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
  },
  activeDurBtn: {
    backgroundColor: '#0056DB',
    borderColor: '#0056DB',
  },
  durBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  activeDurBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Premium Drag & Drop Area
  dragDropZone: {
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    paddingHorizontal: 16,
  },
  dragDropZoneActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: '#3b82f6',
  },
  dragDropText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Google Sans, sans-serif',
    textAlign: 'center',
  },
  dragDropSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  previewsContainer: {
    maxHeight: 190, // Fits exactly 2 rows of 80px + 12px gap + padding
    marginBottom: 28,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  previewsContentContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
  },
  miniPreviewCard: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  miniPreviewImg: {
    width: '100%',
    height: '100%',
  },
  miniPreviewDelete: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formActions: {
    flexDirection: 'row-reverse',
    gap: 16,
  },
  saveFormBtn: {
    backgroundColor: '#0056DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveFormBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelFormBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelFormBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
  },

  // Public Gallery styles
  uploadSection: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 32,
    zIndex: 1000,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  imagePicker: {
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  pickerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'right',
  },
  uploadBtn: {
    backgroundColor: '#0056DB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listSection: {
    paddingTop: 12,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  gridItem: {
    width: '23%',
    minWidth: 120,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  mobileGridItem: {
    width: '46%', // 2 columns on mobile
  },
  gridImage: {
    width: '100%',
    height: 120,
  },
  gridCat: {
    color: '#fff',
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
  },
  galleryDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dropdownTrigger: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginTop: -16,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  dropdownItemText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  dropdownInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 8,
    backgroundColor: '#111827',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  dropdownNewInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 13,
    textAlign: 'right',
  },
  dropdownAddBtn: {
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Calendar styles
  calendarLayout: {
    flexDirection: 'row-reverse',
    gap: 32,
    width: '100%',
  },
  mobileCalendarLayout: {
    flexDirection: 'column',
    gap: 24,
  },
  calendarCard: {
    flex: 1.2,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 24,
  },
  mobileCalendarCard: {
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarMonthText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarDaysRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
  },
  calendarDayHeaderCell: {
    color: '#94a3b8',
    width: '14.28%',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  calendarGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 0,
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 2,
    position: 'relative',
  },
  selectedDayCell: {
    backgroundColor: '#0056DB',
  },
  eventDayCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  calendarDayNumText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  selectedDayNumText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  eventDayNumText: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  calendarDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3b82f6',
  },
  blockedDayCell: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  blockedDayNumText: {
    color: '#f43f5e',
    fontWeight: 'bold',
    textDecorationLine: 'line-through',
  },
  blockedDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f43f5e',
  },
  blockDateBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  blockDateBtnText: {
    color: '#f43f5e',
    fontWeight: 'bold',
    fontSize: 13,
  },
  bookingsPanel: {
    flex: 0.8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 24,
  },
  bookingsPanelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  emptyBookingsText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  bookingItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bookingItemTime: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  addBookingBox: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 20,
  },
  addBookingTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  addBookingInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#fff',
    padding: 10,
    textAlign: 'right',
    marginBottom: 12,
  },
  addBookingBtn: {
    backgroundColor: '#0056DB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBookingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  warningBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.18)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  warningBannerText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'right',
    fontFamily: 'Google Sans, sans-serif',
    lineHeight: 18,
    flex: 1,
  }
});

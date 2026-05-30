import { Colors } from '@/constants/theme';
import { getBookings, saveBooking } from '@/utils/storage';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

// Pricing Constants
const PRICES = {
  booth: 1890,
  magnets: 1190,
  stills: 1490,
  extraBoothThreshold: 300,
  extraBoothPrice: 1000,
};

// Hebrew Month dictionary
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const defaultService = params.service as string; // if navigated from a specific service

  const [loading, setLoading] = useState(true);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  
  // Form State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventType, setEventType] = useState('חתונה');
  const [notes, setNotes] = useState('');
  const [guests, setGuests] = useState(200);
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('23:30');
  
  const [services, setServices] = useState({
    booth: defaultService === 'booth',
    magnets: defaultService === 'magnets',
    stills: defaultService === 'stills',
  });

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4, 1)); // Default to May 2026

  // Responsive Hook
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isMobile = width < 768;
  const isSmallMobile = width < 400;
  const [calendarStage, setCalendarStage] = useState(true);

  // Checkout Popups State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showDBModal, setShowDBModal] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSuccess, setDbSuccess] = useState(false);
  const [imagesCount, setImagesCount] = useState(500);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    loadBlockedDates();
  }, []);

  const loadBlockedDates = async () => {
    setLoading(true);
    const bookings = await getBookings();
    // Block dates that are confirmed or explicitly blocked by admin
    const blocked = bookings.filter(b => b.status === 'blocked' || b.status === 'confirmed').map(b => b.dateStr);
    setBlockedDates(blocked);
    setLoading(false);
  };

  const isDateBlocked = (dayNum: number) => {
    const year = currentMonth.getFullYear();
    const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
    const day = dayNum.toString().padStart(2, '0');
    const dStr = `${year}-${month}-${day}`;
    return blockedDates.includes(dStr);
  };

  // Pricing Calculation
  const calculatePrice = () => {
    let total = 0;
    if (services.booth) {
      total += PRICES.booth;
      if (guests >= PRICES.extraBoothThreshold) {
        total += PRICES.extraBoothPrice;
      }
    }
    if (services.magnets) total += PRICES.magnets;
    if (services.stills) total += PRICES.stills;
    return total;
  };

  const validateForm = () => {
    if (!name.trim()) {
      Platform.OS === 'web' ? window.alert('אנא הזן שם מלא') : Alert.alert('שגיאה', 'אנא הזן שם מלא');
      return false;
    }
    if (!phone.trim()) {
      Platform.OS === 'web' ? window.alert('אנא הזן מספר טלפון') : Alert.alert('שגיאה', 'אנא הזן מספר טלפון');
      return false;
    }
    if (!services.booth && !services.magnets && !services.stills) {
      Platform.OS === 'web' ? window.alert('אנא בחר לפחות שירות אחד') : Alert.alert('שגיאה', 'אנא בחר לפחות שירות אחד');
      return false;
    }
    return true;
  };

  const handleOpenWhatsAppModal = () => {
    if (validateForm()) {
      setShowWhatsAppModal(true);
    }
  };

  const handleOpenDBModal = () => {
    if (validateForm()) {
      setShowDBModal(true);
    }
  };

  const handleFinishWhatsApp = () => {
    const selectedServicesNames = Object.keys(services)
      .filter(k => (services as any)[k])
      .map(k => {
        if (k === 'booth') return 'עמדת צילום AI';
        if (k === 'magnets') return 'צילום מגנטים';
        if (k === 'stills') return 'צילום סטילס פרימיום';
        return '';
      })
      .filter(Boolean)
      .join(', ');

    const msg = `היי NextClip! אשמח לסגור אירוע:
תאריך: ${selectedDate}
שם: ${name}
טלפון: ${phone}
סוג אירוע: ${eventType}
מוזמנים: ${guests}
שעות: ${startTime} - ${endTime}
שירותים: ${selectedServicesNames}
מחיר משוער שראיתי: ${calculatePrice()}₪
הערות: ${notes || 'אין'}`;
    const url = `https://wa.me/972508474111?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
    setShowWhatsAppModal(false);
    router.push('/');
  };

  const handleFinishDB = async () => {
    setDbLoading(true);
    try {
      await saveBooking({
        dateStr: selectedDate!,
        name, phone, email, eventType, notes, startTime, endTime, guests,
        services: Object.keys(services).filter(k => (services as any)[k]),
        totalPrice: calculatePrice(),
      });
      setDbSuccess(true);
    } catch (e) {
      Platform.OS === 'web' ? window.alert('שגיאה בשמירת הפנייה. אנא נסה שוב.') : Alert.alert('שגיאה', 'שגיאה בשמירת הפנייה. אנא נסה שוב.');
    } finally {
      setDbLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getSelectedServicesList = () => {
    return Object.entries(services)
      .filter(([_, active]) => active)
      .map(([key]) => {
        if (key === 'booth') return 'עמדת צילום AI';
        if (key === 'magnets') return 'צילום מגנטים';
        if (key === 'stills') return 'צילום סטילס פרימיום';
        return '';
      })
      .filter(Boolean)
      .join(', ');
  };

  const renderStep1Calendar = (fullScreen = false) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1... Saturday=6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentMonthLabel = `${HEBREW_MONTHS[month]} ${year}`;

    return (
      <View style={[styles.card, fullScreen && styles.fullScreenCalendar]}>
        <Text style={styles.cardTitle}>בחירת תאריך לאירוע</Text>
        
        {/* Month Navigation Row */}
        <View style={styles.calendarHeaderRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
            <Feather name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cardSubtitle}>{currentMonthLabel}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
            <Feather name="chevron-left" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {loading ? <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 40 }} /> : (
          <>
            <View style={styles.calendarDaysRow}>
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <Text key={d} style={styles.dayHeader}>{d}</Text>)}
            </View>
            <View style={styles.calendarGrid}>
              {/* Empty placeholder cells for weekday offset */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCellContainer} />
              ))}
              
              {/* Actual days of the month */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                const blocked = isDateBlocked(dayNum);
                const isSelected = selectedDate === dStr;
                return (
                  <View key={dayNum} style={styles.dayCellContainer}>
                    <TouchableOpacity
                      style={[
                        styles.dayCell,
                        blocked && styles.dayBlocked,
                        isSelected && styles.daySelected
                      ]}
                      disabled={blocked}
                      onPress={() => setSelectedDate(dStr)}
                    >
                      <Text style={[
                        styles.dayText,
                        blocked && styles.dayTextBlocked,
                        isSelected && styles.dayTextSelected
                      ]}>{dayNum}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}
        {fullScreen && (
          <TouchableOpacity
            style={[styles.submitBtn, { marginTop: 24, opacity: selectedDate ? 1 : 0.4 }]}
            onPress={() => selectedDate && setCalendarStage(false)}
            disabled={!selectedDate}
          >
            <Text style={styles.submitBtnText}>המשך להזמנה</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStep2Details = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>פרטי האירוע</Text>
      
      <Text style={styles.label}>שם מלא:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} textAlign="right" placeholder="שם מלא" placeholderTextColor="#666" />
      
      <Text style={styles.label}>טלפון:</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} textAlign="right" keyboardType="phone-pad" placeholder="טלפון" placeholderTextColor="#666" />
      
      <Text style={styles.label}>סוג האירוע:</Text>
      <View style={styles.chipRow}>
        {['חתונה', 'בר/בת מצווה', 'אירוע חברה', 'אחר'].map(t => (
          <TouchableOpacity key={t} style={[styles.chip, eventType === t && styles.chipActive]} onPress={() => setEventType(t)}>
            <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>כמות מוזמנים משוערת: {guests}</Text>
      {Platform.OS === 'web' ? (
        <View style={{ marginVertical: 15 }}>
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value) || 50)}
            className="custom-slider"
            style={{
              width: '100%',
              height: '14px',
              borderRadius: '7px',
              background: `linear-gradient(to right, #3b82f6 ${((guests - 50) / 950) * 100}%, #1f2937 ${((guests - 50) / 950) * 100}%)`,
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
              outline: 'none',
              cursor: 'pointer',
              direction: 'ltr',
              WebkitAppearance: 'none',
            }}
          />
        </View>
      ) : (
        <View style={[styles.chipRow, { marginBottom: 20 }]}> 
          {[50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000].map(num => (
            <TouchableOpacity key={num} style={[styles.chip, guests === num && styles.chipActive]} onPress={() => setGuests(num)}>
              <Text style={[styles.chipText, guests === num && styles.chipTextActive]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row-reverse', gap: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>שעת התחלה:</Text>
          {Platform.OS === 'web' ? (
            <input 
              type="time" 
              value={startTime} 
              onChange={e => setStartTime(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #1f2937', backgroundColor: '#fff', fontSize: '16px', textAlign: 'center', outline: 'none', fontFamily: 'Assistant_400Regular' }} 
            />
          ) : (
            <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} textAlign="center" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>שעת סיום:</Text>
          {Platform.OS === 'web' ? (
            <input 
              type="time" 
              value={endTime} 
              onChange={e => setEndTime(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #1f2937', backgroundColor: '#fff', fontSize: '16px', textAlign: 'center', outline: 'none', fontFamily: 'Assistant_400Regular' }} 
            />
          ) : (
            <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} textAlign="center" />
          )}
        </View>
      </View>

      <Text style={styles.label}>הערות נוספות (לא חובה):</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} textAlign="right" multiline textAlignVertical="top" placeholder="הערות..." placeholderTextColor="#666" />
    </View>
  );

  const renderStep3Services = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>בחירת שירותים</Text>

      <TouchableOpacity style={[styles.serviceBox, services.booth && styles.serviceBoxActive]} onPress={() => setServices({...services, booth: !services.booth})}>
        <View style={styles.serviceBoxHeader}>
          <Text style={[styles.serviceName, isMobile && styles.serviceNameMobile]}>עמדת צילום AI</Text>
          <Feather name={services.booth ? "check-circle" : "circle"} size={isMobile ? 20 : 24} color={services.booth ? "#3b82f6" : "#64748b"} />
        </View>
        <Text style={styles.serviceDesc}>עמדת עץ רטרו פרימיום עם מסך מגע והדפסה במקום. מ-1890₪</Text>
        {services.booth && guests >= PRICES.extraBoothThreshold && (
          <Text style={styles.serviceNote}>* עקב כמות האורחים הגדולה (מעל {PRICES.extraBoothThreshold}), תתווסף עמדה שנייה אוטומטית למניעת תורים (+1000₪).</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.serviceBox, services.magnets && styles.serviceBoxActive]} onPress={() => setServices({...services, magnets: !services.magnets})}>
        <View style={styles.serviceBoxHeader}>
          <Text style={[styles.serviceName, isMobile && styles.serviceNameMobile]}>צילום מגנטים</Text>
          <Feather name={services.magnets ? "check-circle" : "circle"} size={isMobile ? 20 : 24} color={services.magnets ? "#3b82f6" : "#64748b"} />
        </View>
        <Text style={styles.serviceDesc}>מגנטים איכותיים ללא הגבלה במשך האירוע. מ-1190₪</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.serviceBox, services.stills && styles.serviceBoxActive]} onPress={() => setServices({...services, stills: !services.stills})}>
        <View style={styles.serviceBoxHeader}>
          <Text style={[styles.serviceName, isMobile && styles.serviceNameMobile]}>צילום סטילס פרימיום</Text>
          <Feather name={services.stills ? "check-circle" : "circle"} size={isMobile ? 20 : 24} color={services.stills ? "#3b82f6" : "#64748b"} />
        </View>
        <Text style={styles.serviceDesc}>צלם מקצועי לאורך כל האירוע. מ-1490₪</Text>
      </TouchableOpacity>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryDesc}>המחיר עשוי להשתנות בהתאם למיקום ודרישות מיוחדות. שריון התאריך יתבצע רק לאחר שיחת אישור.</Text>
      </View>
    </View>
  );



  const formatHebrewDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ב${HEBREW_MONTHS[monthIdx]} ${year}`;
  };

  const renderLeftDashboard = () => {
    const guestsPercent = ((guests - 50) / 950) * 100;
    const photosPercent = ((imagesCount - 100) / 2400) * 100;

    return (
      <View style={styles.dashboardLeftCard}>
        {/* Guest Count Slider */}
        <View style={styles.sliderGroup}>
          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sliderLabelText}>כמות אורחים</Text>
            <Text style={styles.sliderMaxLimitText}>1000</Text>
          </View>
          
          <View style={styles.sliderTrackWrapper}>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 50)}
              style={{
                width: '100%',
                height: '18px',
                background: `linear-gradient(to right, #ffffff ${guestsPercent}%, #111b2d ${guestsPercent}%)`,
                outline: 'none',
                cursor: 'pointer',
                direction: 'ltr',
                WebkitAppearance: 'none',
                borderRadius: '9px',
              }}
              className="dashboard-range-slider"
            />
            <View style={styles.sliderDotsContainer}>
              {Array.from({ length: 10 }).map((_, idx) => (
                <View key={idx} style={styles.sliderDot} />
              ))}
            </View>
          </View>
          
          <View style={styles.sliderBottomRow}>
            <Text style={styles.sliderMinLimitText}>50</Text>
            <Text style={styles.sliderCurrentValueText}>{guests} אורחים</Text>
          </View>
        </View>

        {/* Photos Count Slider */}
        <View style={styles.sliderGroup}>
          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sliderLabelText}>כמות תמונות</Text>
            <Text style={styles.sliderMaxLimitText}>2500</Text>
          </View>
          
          <View style={styles.sliderTrackWrapper}>
            <input
              type="range"
              min="100"
              max="2500"
              step="50"
              value={imagesCount}
              onChange={(e) => setImagesCount(parseInt(e.target.value) || 100)}
              style={{
                width: '100%',
                height: '18px',
                background: `linear-gradient(to right, #ffffff ${photosPercent}%, #111b2d ${photosPercent}%)`,
                outline: 'none',
                cursor: 'pointer',
                direction: 'ltr',
                WebkitAppearance: 'none',
                borderRadius: '9px',
              }}
              className="dashboard-range-slider"
            />
            <View style={styles.sliderDotsContainer}>
              {Array.from({ length: 12 }).map((_, idx) => (
                <View key={idx} style={styles.sliderDot} />
              ))}
            </View>
          </View>
          
          <View style={styles.sliderBottomRow}>
            <Text style={styles.sliderMinLimitText}>100</Text>
            <Text style={styles.sliderCurrentValueText}>{imagesCount} תמונות</Text>
          </View>
        </View>

        {/* Services Selection inside Left Dashboard Column */}
        <Text style={styles.dashboardServicesTitle}>בחירת שירותים לאירוע:</Text>
        <View style={styles.dashboardServicesRow}>
          <TouchableOpacity 
            style={[styles.dashboardServiceCard, services.booth && styles.dashboardServiceCardActive]} 
            onPress={() => setServices({...services, booth: !services.booth})}
          >
            <View style={styles.dashboardServiceIconRow}>
              <Feather name="check" size={14} color={services.booth ? "#fff" : "transparent"} style={styles.dashboardServiceCheck} />
              <Text style={styles.dashboardServicePrice}>₪1,890</Text>
            </View>
            <Text style={styles.dashboardServiceText}>עמדת צילום AI</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dashboardServiceCard, services.magnets && styles.dashboardServiceCardActive]} 
            onPress={() => setServices({...services, magnets: !services.magnets})}
          >
            <View style={styles.dashboardServiceIconRow}>
              <Feather name="check" size={14} color={services.magnets ? "#fff" : "transparent"} style={styles.dashboardServiceCheck} />
              <Text style={styles.dashboardServicePrice}>₪1,190</Text>
            </View>
            <Text style={styles.dashboardServiceText}>צילום מגנטים</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dashboardServiceCard, services.stills && styles.dashboardServiceCardActive]} 
            onPress={() => setServices({...services, stills: !services.stills})}
          >
            <View style={styles.dashboardServiceIconRow}>
              <Feather name="check" size={14} color={services.stills ? "#fff" : "transparent"} style={styles.dashboardServiceCheck} />
              <Text style={styles.dashboardServicePrice}>₪1,490</Text>
            </View>
            <Text style={styles.dashboardServiceText}>צילום סטילס פרימיום</Text>
          </TouchableOpacity>
        </View>

        {services.booth && guests >= PRICES.extraBoothThreshold && (
          <View style={styles.extraBoothBanner}>
            <Feather name="info" size={16} color="#fbbf24" style={{ marginLeft: 8 }} />
            <Text style={styles.extraBoothBannerText}>
              עקב כמות האורחים הגדולה, תתווסף עמדת צילום AI שנייה אוטומטית (+₪1,000)
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderRightDashboard = () => {
    return (
      <View style={styles.dashboardRightCard}>
        {/* Title and Date row */}
        <View style={styles.dashboardTitleRow}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{formatHebrewDate(selectedDate)}</Text>
          </View>
          <Text style={styles.dashboardMainTitle}>הזמנה</Text>
        </View>

        <View style={styles.dashboardForm}>
          <Text style={styles.dashboardLabel}>שם מלא:</Text>
          <TextInput 
            style={styles.dashboardInput} 
            value={name} 
            onChangeText={setName} 
            textAlign="right" 
            placeholder="שם מלא" 
            placeholderTextColor="#888" 
          />

          <Text style={styles.dashboardLabel}>טלפון:</Text>
          <TextInput 
            style={styles.dashboardInput} 
            value={phone} 
            onChangeText={setPhone} 
            textAlign="right" 
            keyboardType="phone-pad"
            placeholder="טלפון" 
            placeholderTextColor="#888" 
          />

          <Text style={styles.dashboardLabel}>אמייל:</Text>
          <TextInput 
            style={styles.dashboardInput} 
            value={email} 
            onChangeText={setEmail} 
            textAlign="right" 
            keyboardType="email-address"
            placeholder="אמייל" 
            placeholderTextColor="#888" 
          />

          <Text style={styles.dashboardLabel}>סוג האירוע:</Text>
          {Platform.OS === 'web' ? (
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#000000',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                fontWeight: '500',
                textAlign: 'right',
                direction: 'rtl',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23000000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left 15px center',
                backgroundSize: '18px',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled hidden>בחר</option>
              <option value="חתונה">חתונה</option>
              <option value="בר/בת מצווה">בר/בת מצווה</option>
              <option value="אירוע חברה">אירוע חברה</option>
              <option value="אחר">אחר</option>
            </select>
          ) : (
            <View style={styles.chipRow}>
              {['חתונה', 'בר/בת מצווה', 'אירוע חברה', 'אחר'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, eventType === t && styles.chipActive]} onPress={() => setEventType(t)}>
                  <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.dashboardLabel}>הערות נוספות?</Text>
          <TextInput 
            style={[styles.dashboardInput, { height: 110, paddingTop: 12 }]} 
            value={notes} 
            onChangeText={setNotes} 
            textAlign="right" 
            multiline 
            textAlignVertical="top" 
            placeholder="..." 
            placeholderTextColor="#888" 
          />
        </View>
      </View>
    );
  };

  const renderBottomBar = () => {
    const submitAction = () => { if (validateForm()) { setShowCheckoutModal(true); } };

    if (isMobile) {
      return (
        <View style={styles.bottomBarMobile}>
          <View style={styles.bottomBarMobilePriceSection}>
            <Text style={styles.bottomBarPriceLabel}>מחיר כולל:</Text>
            <Text style={styles.bottomBarPriceValueMobile}>₪{calculatePrice().toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.bottomBarSubmitBtnMobile} onPress={submitAction}>
            <Feather name="arrow-left" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.bottomBarSubmitBtnText}>שריון האירוע</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.bottomBar}>
        {/* Left Side: Submit Button */}
        <TouchableOpacity
          style={styles.bottomBarSubmitBtn}
          onPress={submitAction}
        >
          <Feather name="arrow-left" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.bottomBarSubmitBtnText}>שריון האירוע</Text>
        </TouchableOpacity>

        {/* Center/Right Side: Selected Services & Price */}
        <View style={styles.bottomBarRightContainer}>
          {/* Services summary cards */}
          <View style={styles.bottomBarServices}>
            {services.booth && (
              <View style={styles.bottomBarServiceCard}>
                <Text style={styles.bottomBarCardTitle}>עמדת צילום AI</Text>
                <Text style={styles.bottomBarCardSubtitle}>{guests >= 300 ? "2 עמדות צילום" : "עמדת צילום 1"}</Text>
                <Text style={styles.bottomBarCardPrice}>₪{(PRICES.booth + (guests >= PRICES.extraBoothThreshold ? PRICES.extraBoothPrice : 0)).toLocaleString()}</Text>
              </View>
            )}
            {services.magnets && (
              <View style={styles.bottomBarServiceCard}>
                <Text style={styles.bottomBarCardTitle}>צילום מגנטים</Text>
                <Text style={styles.bottomBarCardSubtitle}>ללא הגבלה</Text>
                <Text style={styles.bottomBarCardPrice}>₪{PRICES.magnets.toLocaleString()}</Text>
              </View>
            )}
            {services.stills && (
              <View style={styles.bottomBarServiceCard}>
                <Text style={styles.bottomBarCardTitle}>צילום סטילס</Text>
                <Text style={styles.bottomBarCardSubtitle}>צלם פרימיום</Text>
                <Text style={styles.bottomBarCardPrice}>₪{PRICES.stills.toLocaleString()}</Text>
              </View>
            )}
          </View>

          {/* Overall Price display */}
          <View style={styles.bottomBarPriceBox}>
            <Text style={styles.bottomBarPriceValue}>₪{calculatePrice().toLocaleString()}</Text>
            <Text style={styles.bottomBarPriceLabel}>מחיר כולל:</Text>
          </View>
        </View>
      </View>
    );
  };

  const showDesktopLayout = isLargeScreen && Platform.OS === 'web';

  return (
    <View style={styles.pageContainer}>
      <View style={styles.pageMiniHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageMiniLogo}>NextClip</Text>
      </View>
      {calendarStage ? (
        <View style={styles.calendarStage}>
          {renderStep1Calendar(true)}
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.pageBody, !showDesktopLayout && styles.pageBodyColumn]}>
          <View style={showDesktopLayout ? styles.leftColumn : styles.columnFull}>
            {renderStep2Details()}
          </View>
          <View style={showDesktopLayout ? styles.rightColumn : styles.columnFull}>
            {renderStep3Services()}
          </View>
        </ScrollView>
      )}

      {!calendarStage && renderBottomBar()}

      {/* ==================== UNIFIED CHECKOUT MODAL ==================== */}
      <Modal
        visible={showCheckoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>איך תרצו להתקדם?</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              הכנו את כל פרטי ההזמנה שלך! באפשרותך לשלוח פנייה ישירה למערכת שלנו או ליצור קשר מהיר וישיר בוואטסאפ:
            </Text>

            <View style={styles.modalSummaryBox}>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>שם מלא:</Text>
                <Text style={styles.modalSummaryValue}>{name}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>טלפון:</Text>
                <Text style={styles.modalSummaryValue}>{phone}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>תאריך אירוע:</Text>
                <Text style={styles.modalSummaryValue}>{formatHebrewDate(selectedDate)}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>שירותים שנבחרו:</Text>
                <Text style={[styles.modalSummaryValue, { maxWidth: 220, textAlign: 'left' }]}>
                  {getSelectedServicesList() || 'לא נבחרו שירותים'}
                </Text>
              </View>
              <View style={[styles.modalSummaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.modalSummaryLabel}>מחיר משוער:</Text>
                <Text style={[styles.modalSummaryValue, { color: '#10b981', fontSize: 16 }]}>₪{calculatePrice().toLocaleString()}</Text>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 10 }}>
              <TouchableOpacity 
                style={[styles.modalActionBtnGreen, { paddingVertical: 16, borderRadius: 10 }]} 
                onPress={() => {
                  setShowCheckoutModal(false);
                  handleFinishWhatsApp();
                }}
              >
                <FontAwesome5 name="whatsapp" size={20} color="#fff" style={{ marginLeft: 8 }} />
                <Text style={[styles.modalBtnText, { fontSize: 18 }]}>המשך שיחה בוואטסאפ (מומלץ)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalActionBtnBlue, { paddingVertical: 16, borderRadius: 10 }]} 
                onPress={() => {
                  setShowCheckoutModal(false);
                  handleOpenDBModal();
                }}
              >
                <Text style={[styles.modalBtnText, { fontSize: 18 }]}>שלח פנייה למערכת</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== WHATSAPP CHECKOUT MODAL ==================== */}
      <Modal
        visible={showWhatsAppModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWhatsAppModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>סגירה מהירה בוואטסאפ</Text>
              <TouchableOpacity onPress={() => setShowWhatsAppModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              הכנו את כל הפרטים עבורך! בלחיצה על כפתור המעבר, ייפתח צ'אט וואטסאפ ישיר עם נציג NextClip ובו יישלחו פרטי ההזמנה שלך:
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>שם מלא:</Text>
                <Text style={styles.summaryValue}>{name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>טלפון:</Text>
                <Text style={styles.summaryValue}>{phone}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>תאריך אירוע:</Text>
                <Text style={styles.summaryValue}>{selectedDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>סוג אירוע:</Text>
                <Text style={styles.summaryValue}>{eventType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>כמות מוזמנים:</Text>
                <Text style={styles.summaryValue}>{guests}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>שירותים שנבחרו:</Text>
                <Text style={[styles.summaryValue, { maxWidth: 200, color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'left' }]}>
                  {getSelectedServicesList() || 'לא נבחרו שירותים'}
                </Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryLabel}>מחיר משוער:</Text>
                <Text style={[styles.summaryValue, { color: '#10b981', fontSize: 16 }]}>₪{calculatePrice().toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalActionBtnGreen} onPress={handleFinishWhatsApp}>
                <FontAwesome5 name="whatsapp" size={18} color="#fff" style={{ marginLeft: 8 }} />
                <Text style={styles.modalBtnText}>פתח וואטסאפ עכשיו</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowWhatsAppModal(false)}>
                <Text style={styles.modalCancelBtnText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== DB / INQUIRY CHECKOUT MODAL ==================== */}
      <Modal
        visible={showDBModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!dbLoading) {
            setShowDBModal(false);
            setDbSuccess(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!dbSuccess ? (
              <>
                <View style={styles.modalTitleRow}>
                  <Text style={styles.modalTitle}>שליחת פנייה למערכת</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDBModal(false)} 
                    style={styles.modalCloseBtn}
                    disabled={dbLoading}
                  >
                    <Feather name="x" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalText}>
                  בלחיצה על שליחה, פרטי הפנייה יישמרו במערכת ונציג מטעמנו יחזור אליך בהקדם האפשרי לתיאום סופי ושריון התאריך.
                </Text>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>שם מלא:</Text>
                    <Text style={styles.summaryValue}>{name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>טלפון:</Text>
                    <Text style={styles.summaryValue}>{phone}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>תאריך אירוע:</Text>
                    <Text style={styles.summaryValue}>{selectedDate}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>מחיר משוער:</Text>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>₪{calculatePrice().toLocaleString()}</Text>
                  </View>
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity 
                    style={styles.modalActionBtnBlue} 
                    onPress={handleFinishDB}
                    disabled={dbLoading}
                  >
                    {dbLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalBtnText}>אשר ושמור פנייה</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.modalCancelBtn} 
                    onPress={() => setShowDBModal(false)}
                    disabled={dbLoading}
                  >
                    <Text style={styles.modalCancelBtnText}>ביטול</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.successContainer}>
                <Feather name="check-circle" size={60} color="#10b981" />
                <Text style={styles.successTitle}>הפנייה נשלחה בהצלחה! 🎉</Text>
                <Text style={styles.successText}>
                  תודה רבה {name}, שמרנו את פרטי האירוע לתאריך {selectedDate}. נציג מטעמנו ייצור איתך קשר טלפוני בהקדם לאישור סופי.
                </Text>
                <TouchableOpacity 
                  style={styles.homeBtn} 
                  onPress={() => {
                    setShowDBModal(false);
                    setDbSuccess(false);
                    router.push('/');
                  }}
                >
                  <Text style={styles.homeBtnText}>חזרה לעמוד הבית</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create<any>({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  pageContainer: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: '#0a1120',
    overflow: 'hidden',
  },
  calendarStage: {
    flex: 1,
    padding: 0,
    minHeight: 0,
    justifyContent: 'center',
  },
  fullScreenCalendar: {
    flex: 1,
    width: '100%',
    height: '100%',
    marginBottom: 0,
    minHeight: 0,
    padding: 16,
    paddingBottom: 22,
    justifyContent: 'space-between',
    backgroundColor: '#0f172b',
    borderRadius: 24,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  pageBody: {
    flexGrow: 1,
    flexDirection: 'row-reverse',
    gap: 24,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 40,
    minHeight: 0,
  },
  pageBodyColumn: {
    flexDirection: 'column',
    gap: 24,
  },
  pageMiniHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageMiniLogo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
    paddingTop: 30,
    paddingBottom: 100,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepper: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
  },
  stepDot: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#374151'
  },
  stepDotActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  stepDotText: { color: '#9ca3af', fontWeight: 'bold' },
  stepDotTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#111827',
    borderWidth: 1, borderColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    paddingHorizontal: 20,
    marginBottom: 30,
    flex: 1,
  },
  cardTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20 },
  cardSubtitle: { fontSize: 18, color: '#9ca3af', textAlign: 'center', fontWeight: 'bold' },

  // Responsive two-column layout
  bookingGrid: {
    flexDirection: 'row-reverse',
    gap: 30,
    width: '100%',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  leftColumn: {
    flex: 1.4,
    minWidth: 360,
  },
  rightColumn: {
    flex: 1,
    minWidth: 360,
  },
  twoColumnLayout: {
    flexDirection: 'row-reverse',
    gap: 30,
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  singleColumnLayout: {
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    marginBottom: 20,
  },
  columnRight: {
    flex: 1.2,
    minWidth: 320,
  },
  columnLeft: {
    flex: 1,
    minWidth: 320,
  },
  columnFull: {
    width: '100%',
  },

  // Calendar
  calendarHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  monthNavBtn: {
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDaysRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  dayHeader: { width: '14.28%', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  calendarGrid: { 
    flex: 1,
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
  },
  dayCellContainer: {
    width: '14.28%',
    height: '16.66%',
    padding: 4,
  },
  dayCell: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#1f2937',
    borderRadius: 8,
  },
  dayText: { color: '#fff', fontSize: 16 },
  dayBlocked: { backgroundColor: '#374151', opacity: 0.5 },
  dayTextBlocked: { color: '#9ca3af', textDecorationLine: 'line-through' },
  daySelected: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  dayTextSelected: { color: '#fff', fontWeight: 'bold' },

  // Form
  label: { color: '#e2e8f0', fontSize: 16, marginBottom: 8, marginTop: 16, textAlign: 'right' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    textAlign: 'right'
  },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151'
  },
  chipActive: { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: '#3b82f6' },
  chipText: { color: '#9ca3af' },
  chipTextActive: { color: '#3b82f6', fontWeight: 'bold' },

  // Services
  serviceBox: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2, borderColor: 'transparent'
  },
  serviceBoxActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' },
  serviceBoxHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  serviceName: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  serviceNameMobile: { fontSize: 16 },
  serviceDesc: { color: '#9ca3af', textAlign: 'right', fontSize: 14 },
  serviceNote: { color: '#fbbf24', textAlign: 'right', fontSize: 13, marginTop: 8 },

  summaryBox: {
    marginTop: 20, padding: 20,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: '#10b981',
    alignItems: 'center'
  },
  summaryTitle: { color: '#10b981', fontSize: 16, marginBottom: 8 },
  summaryPrice: { color: '#10b981', fontSize: 36, fontWeight: 'bold', marginBottom: 8 },
  summaryDesc: { color: '#6ee7b7', fontSize: 12, textAlign: 'center' },

  // Nav
  navButtons: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 16, marginTop: 10 },
  nextBtn: { flex: 1, backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { backgroundColor: '#374151', padding: 16, borderRadius: 8, alignItems: 'center', paddingHorizontal: 30 },
  backBtnText: { color: '#fff', fontSize: 18 },
  whatsappBtn: { backgroundColor: '#25D366', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, borderRadius: 8, marginBottom: 10 },
  whatsappBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#4b5563' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 24,
    width: '100%',
    maxWidth: 550,
    direction: 'rtl',
  },
  modalTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalText: {
    color: '#9ca3af',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#374151',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  modalButtonsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  modalActionBtnGreen: {
    flex: 1.5,
    backgroundColor: '#25D366',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  modalActionBtnBlue: {
    flex: 1.5,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    color: '#fff',
    fontSize: 16,
  },

  // Success screen inside modal
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  successText: {
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  homeBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  homeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Web Dashboard Redesign Styles
  dashboardContainer: {
    flex: 1,
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: '#0a1120',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  dashboardBody: {
    flex: 1,
    flexDirection: 'row-reverse',
    width: '100%',
    paddingHorizontal: 40,
    paddingVertical: 20,
    gap: 40,
    alignItems: 'stretch',
  },
  dashboardLeftColumn: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 25,
    paddingTop: 10,
  },
  dashboardRightColumn: {
    flex: 1.1,
    justifyContent: 'flex-start',
    gap: 15,
  },
  dashboardLeftCard: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  dashboardRightCard: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  dashboardTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
  },
  dashboardMainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dateBadge: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dashboardForm: {
    width: '100%',
    gap: 12,
  },
  dashboardLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 6,
  },
  dashboardInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sliderGroup: {
    marginBottom: 20,
  },
  sliderHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sliderMaxLimitText: {
    fontSize: 14,
    color: '#64748b',
  },
  sliderTrackWrapper: {
    position: 'relative',
    width: '100%',
    height: 24,
    justifyContent: 'center',
  },
  sliderDotsContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: '50%',
    transform: [{ translateY: -3 }],
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    zIndex: 1,
  },
  sliderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  sliderBottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sliderMinLimitText: {
    fontSize: 14,
    color: '#64748b',
  },
  sliderCurrentValueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  dashboardServicesTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 15,
    marginBottom: 10,
  },
  dashboardServicesRow: {
    flexDirection: 'row-reverse',
    gap: 15,
    width: '100%',
  },
  dashboardServiceCard: {
    flex: 1,
    backgroundColor: '#111b2d',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardServiceCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  dashboardServiceIconRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  dashboardServiceCheck: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 1,
  },
  dashboardServicePrice: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  dashboardServiceText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  extraBoothBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  extraBoothBannerText: {
    color: '#fbbf24',
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
  },
  bottomBar: {
    height: 100,
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: '#3b82f6',
  },
  bottomBarMobile: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#3b82f6',
    gap: 12,
  },
  bottomBarMobilePriceSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  bottomBarPriceValueMobile: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  bottomBarSubmitBtnMobile: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarSubmitBtn: {
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarSubmitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBarRightContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 20,
  },
  bottomBarServices: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  bottomBarServiceCard: {
    backgroundColor: '#0a1120',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  bottomBarCardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomBarCardSubtitle: {
    color: '#94a3b8',
    fontSize: 10,
  },
  bottomBarCardPrice: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  bottomBarPriceBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  bottomBarPriceLabel: {
    color: '#ffffff',
    opacity: 0.8,
    fontSize: 15,
  },
  bottomBarPriceValue: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },
});

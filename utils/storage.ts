import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type GalleryImage = {
  id: string;
  uri: string;
  /**
   * High-resolution copy used by the gallery lightbox. `uri` stays small so the
   * wall of thumbnails loads fast. Older images predate this field — the
   * lightbox falls back to `uri` for them.
   */
  fullUri?: string;
  category: string;
  width: number;
  height: number;
  col: number;
  row_y: number;
};

export type ClientEvent = {
  id: string;
  name: string;
  code: string;
  date: string;
  duration: '30' | '60' | '90' | 'never';
  createdAt: string;
  images: string[];
};

const STORAGE_KEY = '@nextclip_gallery_images';
const EVENTS_STORAGE_KEY = '@nextclip_client_events';

const IMG_WIDTH = 300;
const GAP = 12;
const NUM_COLS = 8;

// Gallery derivatives: a light one for the tiled wall, a big one for the
// lightbox. Both are encoded once, straight from the original file — going
// through the uploader's own compressor as well used to re-encode an already
// lossy JPEG, which is what made opened photos look mushy.
const GRID_MAX_DIM  = 700;
const GRID_QUALITY  = 0.82;
const FULL_MAX_DIM  = 2000;
const FULL_QUALITY  = 0.88;

export const GRID_TOTAL_WIDTH = NUM_COLS * (IMG_WIDTH + GAP) - GAP;

// --- IMAGE COMPRESSION HELPER FOR WEB ---

const compressImageWeb = async (uri: string, maxDim = 1200, quality = 0.75): Promise<string> => {
  if (Platform.OS !== 'web') return uri;
  
  return new Promise<string>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(uri);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.error('Failed resizing image on canvas', err);
        resolve(uri);
      }
    };
    img.onerror = () => {
      resolve(uri);
    };
    img.src = uri;
  });
};

// --- PUBLIC GALLERY FUNCTIONS ---

export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const apiGallery = await fetchWithFallback('get_gallery');
    if (apiGallery && Array.isArray(apiGallery)) {
      // The API call succeeded — it's the source of truth, even when the
      // gallery is genuinely empty. Treating an empty result the same as a
      // failed/unreachable call (old behavior) was why an empty gallery
      // used to render random stock "default" photos instead of nothing.
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apiGallery));
      return apiGallery;
    }
    // API unreachable — fall back to whatever was last cached locally.
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.length > 0 && parsed[0].col === undefined) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return [];
      }
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Failed to load images', error);
    return [];
  }
};

export const saveGalleryImage = async (image: Omit<GalleryImage, 'id' | 'col' | 'row_y'>) => {
  try {
    const images = await getGalleryImages();

    const stamp = Date.now();
    let uploadedUri: string;
    let uploadedFullUri: string | undefined;

    if (Platform.OS === 'web') {
      // Two encodes from the same original — never one from the other.
      const gridUri = await compressImageWeb(image.uri, GRID_MAX_DIM, GRID_QUALITY);
      const fullUri = await compressImageWeb(image.uri, FULL_MAX_DIM, FULL_QUALITY);
      uploadedUri     = await uploadImageToVercelBlob(gridUri, `gallery_${stamp}.jpg`, true);
      uploadedFullUri = await uploadImageToVercelBlob(fullUri, `gallery_${stamp}_full.jpg`, true);
      if (uploadedFullUri === uploadedUri) uploadedFullUri = undefined;
    } else {
      uploadedUri = await uploadImageToVercelBlob(image.uri, `gallery_${stamp}.jpg`);
    }

    const colHeights = new Array(NUM_COLS).fill(0);
    images.forEach(img => {
      const bottom = img.row_y + img.height + GAP;
      if (bottom > colHeights[img.col]) colHeights[img.col] = bottom;
    });

    let minCol = 0;
    for (let c = 1; c < NUM_COLS; c++) {
      if (colHeights[c] < colHeights[minCol]) minCol = c;
    }

    const newImage: GalleryImage = {
      ...image,
      uri: uploadedUri,
      ...(uploadedFullUri ? { fullUri: uploadedFullUri } : {}),
      id: stamp.toString(),
      col: minCol,
      row_y: colHeights[minCol],
    };
    images.push(newImage);
    
    await fetchWithFallback('save_gallery', { data: images });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    return newImage;
  } catch (error) {
    console.error('Failed to save image', error);
  }
};

// --- CLOUD API DATABASE CONFIG & UTILS ---

const getApiUrl = () => {
  // /api/nextclip-db is backed by @vercel/blob (api/nextclip-db.js) — real
  // shared cloud storage every device reads/writes the same data from.
  // (There's a second route, /api/db, that looks similar but only writes to
  // the serverless function's local disk — that disk isn't shared across
  // instances or requests on Vercel, so devices would see different data.)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/nextclip-db`;
  }
  // Fallback for native/SSR if needed (assuming local dev server)
  return 'http://localhost:8081/api/nextclip-db';
};

const shouldCallApi = () => {
  return true; // Always call our local Expo API
};

const fetchWithFallback = async (action: string, bodyData?: any) => {
  if (shouldCallApi()) {
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) return null;

      const response = await fetch(apiUrl, {
        method: 'POST', // Always POST to safely transmit JSON body with action!
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...bodyData }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Vercel Blob API failed, falling back to local storage:', e);
    }
  }
  return null;
};

const uploadImageToVercelBlob = async (
  uri: string,
  filename: string,
  /** Caller already encoded the exact bytes it wants — don't re-encode them. */
  alreadyCompressed = false,
): Promise<string> => {
  try {
    // 1. If it's already uploaded to the cloud CDN, keep it
    if (uri.startsWith('http') && !uri.startsWith('data:') && !uri.includes('localhost')) {
      return uri;
    }

    // 2. Compress the image to small base64 string on Web to prevent payload size limits and expired blobs!
    let activeUri = uri;
    if (Platform.OS === 'web' && !alreadyCompressed) {
      activeUri = await compressImageWeb(uri);
    }

    // 3. If we are in local offline mode (or API shouldn't be called), return the permanent compressed base64 URI immediately
    if (!shouldCallApi()) {
      return activeUri;
    }

    // 4. Try uploading to secure Vercel Blob cloud database
    let base64 = '';
    if (activeUri.startsWith('data:')) {
      const parts = activeUri.split(',');
      base64 = parts[1] || parts[0];
    } else {
      base64 = activeUri;
    }

    const apiUrl = getApiUrl();
    if (!apiUrl) return activeUri;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload',
        filename,
        base64,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.url) {
        return data.url; // Vercel Blob public CDN URL
      }
    }
    
    // 5. If Vercel API is not configured or fails, return the compressed base64!
    return activeUri;
  } catch (e) {
    console.error('Vercel Blob image upload failed:', e);
  }
  return uri;
};

// --- CLIENT PRIVATE EVENTS FUNCTIONS ---

export const getClientEvents = async (): Promise<ClientEvent[]> => {
  try {
    const localData = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    const localEvents = localData ? JSON.parse(localData) : [];

    // Try Vercel Serverless database first
    const apiEvents = await fetchWithFallback('get_events');
    if (apiEvents && Array.isArray(apiEvents)) {
      // If server is empty but we have local events, push them to server in background to sync!
      if (apiEvents.length === 0 && localEvents.length > 0) {
        try {
          await fetchWithFallback('save_events', { data: localEvents });
        } catch (e) {
          console.warn('Auto-sync local events to server failed:', e);
        }
        return localEvents;
      }

      // Merge events so we don't lose local events that aren't on the server yet
      const mergedMap = new Map<string, ClientEvent>();
      
      // Load local ones first
      localEvents.forEach((ev: any) => {
        if (ev && ev.id) mergedMap.set(ev.id, ev);
      });

      // Load server ones over them (server is source of truth for synced ones)
      apiEvents.forEach((ev: any) => {
        if (ev && ev.id) mergedMap.set(ev.id, ev);
      });

      const merged = Array.from(mergedMap.values());
      await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    // Local storage fallback
    const data = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    const defaultEvents = generateMockEvents();
    await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(defaultEvents));
    return defaultEvents;
  } catch (error) {
    console.error('Failed to load client events', error);
    return [];
  }
};

export const saveClientEvent = async (event: Omit<ClientEvent, 'id' | 'createdAt'> & { id?: string }) => {
  try {
    // 1. Automatically upload any new base64/local image to Vercel Blob in background
    const uploadedImages: string[] = [];
    for (let i = 0; i < event.images.length; i++) {
      const uri = event.images[i];
      const uploadedUri = await uploadImageToVercelBlob(uri, `event_photo_${i + 1}.jpg`);
      uploadedImages.push(uploadedUri);
    }
    const sanitizedEvent = {
      ...event,
      images: uploadedImages,
    };

    // 2. Fetch existing and merge
    const events = await getClientEvents();
    let updatedEvents = [...events];
    
    if (event.id) {
      const idx = events.findIndex(e => e.id === event.id);
      if (idx !== -1) {
        updatedEvents[idx] = {
          ...events[idx],
          ...sanitizedEvent,
        } as ClientEvent;
      }
    } else {
      const newEvent: ClientEvent = {
        ...sanitizedEvent,
        id: 'event-' + Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      updatedEvents.push(newEvent);
    }

    // 3. Write to Vercel serverless database if active
    await fetchWithFallback('save_events', { data: updatedEvents });

    // 4. Always back up to local storage
    await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updatedEvents));
  } catch (error) {
    console.error('Failed to save client event', error);
  }
};

export const deleteClientEvent = async (eventId: string) => {
  try {
    const events = await getClientEvents();
    const filtered = events.filter(e => e.id !== eventId);

    // Save update to Vercel serverless database if active
    await fetchWithFallback('save_events', { data: filtered });

    // Back up locally
    await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete client event', error);
  }
};

export const deleteGalleryImage = async (imageId: string): Promise<GalleryImage[]> => {
  try {
    const images = await getGalleryImages();
    const filtered = images.filter(img => img.id !== imageId);

    // Recalculate columns heights for remaining images to keep masonry layout balanced
    const colHeights = new Array(NUM_COLS).fill(0);
    const updated = filtered.map(img => {
      let minCol = 0;
      for (let c = 1; c < NUM_COLS; c++) {
        if (colHeights[c] < colHeights[minCol]) minCol = c;
      }
      const top = colHeights[minCol];
      colHeights[minCol] += img.height + GAP;
      return {
        ...img,
        col: minCol,
        row_y: top,
      };
    });

    // Write to server
    await fetchWithFallback('save_gallery', { data: updated });

    // Back up locally
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to delete gallery image', error);
    return [];
  }
};

const generateMockEvents = (): ClientEvent[] => {
  return [
    {
      id: 'mock-event-1',
      name: 'החתונה של יובל ועדי',
      code: '1234',
      date: '2026-05-24',
      duration: '90',
      createdAt: new Date().toISOString(),
      images: [
        'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600',
        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600',
        'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=600',
        'https://images.unsplash.com/photo-1519225495810-7512c696505a?q=80&w=600',
      ],
    },
    {
      id: 'mock-event-2',
      name: 'בר המצווה של נועם',
      code: '5678',
      date: '2026-06-12',
      duration: '30',
      createdAt: new Date().toISOString(),
      images: [
        'https://images.unsplash.com/photo-1549417229-aa67d3263c09?q=80&w=600',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600',
        'https://images.unsplash.com/photo-1496024840928-4c417adf211d?q=80&w=600',
      ],
    }
  ];
};

// --- LEADS & BOOKINGS FUNCTIONS ---

export type ContactLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  date: string;
};

export type BookingLead = {
  id: string;
  dateStr: string; // YYYY-MM-DD
  name: string;
  phone: string;
  email: string;
  location?: string;
  eventType: string;
  notes: string;
  startTime: string;
  endTime: string;
  guests: number;
  services: string[];
  totalPrice: number;
  status: 'pending' | 'blocked' | 'confirmed';
  createdAt: string;
};

export const getLeads = async (): Promise<ContactLead[]> => {
  try {
    const apiLeads = await fetchWithFallback('get_leads');
    if (apiLeads && Array.isArray(apiLeads)) return apiLeads;
    
    const localData = await AsyncStorage.getItem('@nextclip_leads');
    return localData ? JSON.parse(localData) : [];
  } catch {
    return [];
  }
};

export const saveLead = async (lead: Omit<ContactLead, 'id' | 'date'>) => {
  try {
    const newLead: ContactLead = {
      ...lead,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    const leads = await getLeads();
    const updated = [newLead, ...leads];
    
    await fetchWithFallback('save_leads', { data: updated });
    await AsyncStorage.setItem('@nextclip_leads', JSON.stringify(updated));
    return newLead;
  } catch (e) {
    console.error('Failed to save lead', e);
  }
};

export const getBookings = async (): Promise<BookingLead[]> => {
  try {
    const apiBookings = await fetchWithFallback('get_bookings');
    if (apiBookings && Array.isArray(apiBookings)) return apiBookings;
    
    const localData = await AsyncStorage.getItem('@nextclip_bookings');
    return localData ? JSON.parse(localData) : [];
  } catch {
    return [];
  }
};

export const saveBooking = async (booking: Omit<BookingLead, 'id' | 'createdAt' | 'status'> & { id?: string, status?: string }) => {
  try {
    const bookings = await getBookings();
    let updated = [...bookings];
    
    if (booking.id) {
      const idx = updated.findIndex(b => b.id === booking.id);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], ...booking } as BookingLead;
      }
    } else {
      updated.push({
        ...booking,
        status: booking.status || 'pending',
        id: 'booking-' + Date.now().toString(),
        createdAt: new Date().toISOString(),
      } as BookingLead);
    }
    
    await fetchWithFallback('save_bookings', { data: updated });
    await AsyncStorage.setItem('@nextclip_bookings', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save booking', e);
  }
};


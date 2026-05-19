import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type GalleryImage = {
  id: string;
  uri: string;
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
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.length > 0 && parsed[0].col === undefined) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return generateMockImages();
      }
      return parsed;
    }
    return generateMockImages();
  } catch (error) {
    console.error('Failed to load images', error);
    return [];
  }
};

export const saveGalleryImage = async (image: Omit<GalleryImage, 'id' | 'col' | 'row_y'>) => {
  try {
    const images = await getGalleryImages();
    
    let uri = image.uri;
    if (Platform.OS === 'web') {
      uri = await compressImageWeb(uri, 600, 0.75); // Gallery images are smaller, max 600px is perfect!
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
      uri,
      id: Date.now().toString(),
      col: minCol,
      row_y: colHeights[minCol],
    };
    images.push(newImage);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    return newImage;
  } catch (error) {
    console.error('Failed to save image', error);
  }
};

const generateMockImages = (): GalleryImage[] => {
  const categories = ['#חתונה', '#בר מצווה', '#בת מצווה', '#אירוע חברה'];
  const images: GalleryImage[] = [];
  const colHeights = new Array(NUM_COLS).fill(0);

  for (let i = 0; i < 50; i++) {
    let minCol = 0;
    for (let c = 1; c < NUM_COLS; c++) {
      if (colHeights[c] < colHeights[minCol]) minCol = c;
    }

    const heights = [200, 250, 300, 350, 400];
    const h = heights[Math.floor(Math.random() * heights.length)];

    images.push({
      id: `mock-${i}`,
      uri: `https://picsum.photos/seed/nc${i + 1}/${IMG_WIDTH}/${h}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      width: IMG_WIDTH,
      height: h,
      col: minCol,
      row_y: colHeights[minCol],
    });

    colHeights[minCol] += h + GAP;
  }

  return images;
};

// --- CLOUD API DATABASE CONFIG & UTILS ---

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_VERCEL_API_URL) {
    return process.env.EXPO_PUBLIC_VERCEL_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/nextclip-db`;
  }
  return '';
};

const shouldCallApi = () => {
  // If explicitly connected via environment variables locally, allow calling the cloud API
  if (process.env.EXPO_PUBLIC_VERCEL_API_URL) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('192.168.');
};

const fetchWithFallback = async (action: string, bodyData?: any) => {
  if (shouldCallApi()) {
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) return null;

      const response = await fetch(apiUrl, {
        method: bodyData ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: bodyData ? JSON.stringify({ action, ...bodyData }) : undefined,
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

const uploadImageToVercelBlob = async (uri: string, filename: string): Promise<string> => {
  try {
    // 1. If it's already uploaded to the cloud CDN, keep it
    if (uri.startsWith('http') && !uri.startsWith('data:') && !uri.includes('localhost')) {
      return uri;
    }

    // 2. Compress the image to small base64 string on Web to prevent payload size limits and expired blobs!
    let activeUri = uri;
    if (Platform.OS === 'web') {
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

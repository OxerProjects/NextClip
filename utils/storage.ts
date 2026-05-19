import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Auto-uploader of local base64/blob images to secure Vercel Blob storage
const uploadImageToVercelBlob = async (uri: string, filename: string): Promise<string> => {
  try {
    if (!shouldCallApi()) return uri;
    if (uri.startsWith('http') && !uri.startsWith('data:') && !uri.includes('localhost')) {
      return uri; // Already uploaded to cloud CDN
    }

    let base64 = '';
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      base64 = parts[1] || parts[0];
    } else {
      const response = await fetch(uri);
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const parts = res.split(',');
          resolve(parts[1] || parts[0]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const response = await fetch(`${window.location.origin}/api/nextclip-db`, {
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
      return data.url; // Vercel Blob URL
    }
  } catch (e) {
    console.error('Vercel Blob image upload failed:', e);
  }
  return uri;
};

// --- CLIENT PRIVATE EVENTS FUNCTIONS ---

export const getClientEvents = async (): Promise<ClientEvent[]> => {
  try {
    // Try Vercel Serverless database first
    const apiEvents = await fetchWithFallback('get_events');
    if (apiEvents) {
      // Also update local cache for offline speeds
      await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(apiEvents));
      return apiEvents;
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

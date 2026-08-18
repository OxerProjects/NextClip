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

/**
 * Decodes the source once and encodes several sizes from it. Calling
 * compressImageWeb per size re-decodes the original every time, which is the
 * expensive half of the work for a big camera JPEG.
 */
const encodeVariantsWeb = async (
  uri: string,
  variants: { maxDim: number; quality: number }[],
): Promise<string[]> => {
  if (Platform.OS !== 'web') return variants.map(() => uri);

  return new Promise<string[]>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(variants.map(() => uri)); return; }

        resolve(variants.map(({ maxDim, quality }) => {
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
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', quality);
        }));
      } catch (err) {
        console.error('Failed resizing image on canvas', err);
        resolve(variants.map(() => uri));
      }
    };
    img.onerror = () => resolve(variants.map(() => uri));
    img.src = uri;
  });
};

/** Runs `fn` over `items`, keeping at most `limit` of them in flight. */
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
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

/** How many photos are encoded + uploaded at the same time. */
const UPLOAD_CONCURRENCY = 3;

/**
 * What an upload is doing right now, for the progress bar.
 *
 * `ratio` is 0..1 across the whole job and is driven by **bytes actually sent**
 * during the upload phase, not by a photo counter — a counter sits still for
 * seconds on a slow uplink and then jumps, which is what made uploads feel
 * frozen even after they got faster.
 */
export type UploadProgress = {
  phase: 'preparing' | 'uploading' | 'saving' | 'done';
  /** Photos finished in the current phase. */
  done: number;
  total: number;
  ratio: number;
  sentBytes: number;
  totalBytes: number;
  elapsedMs: number;
  /** Null until enough bytes have moved to estimate. */
  etaMs: number | null;
  /** Filled in on the final 'done' report — where the time actually went. */
  timings?: { prepareMs: number; uploadMs: number; saveMs: number; totalMs: number; bytes: number };
};

/** Share of the bar given to each phase. Uploading dominates in practice. */
const PHASE_WEIGHT = { preparing: 0.15, uploading: 0.8, saving: 0.05 };

const dataUrlBytes = (dataUrl: string) => {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  return Math.round((dataUrl.length - comma - 1) * 0.75); // base64 → bytes
};

/**
 * POSTs one image and reports bytes as they leave the browser.
 *
 * fetch() cannot report upload progress at all, so this uses XHR — the only way
 * to drive a progress bar off real transfer instead of a guess.
 */
const postImageWithProgress = (
  apiUrl: string,
  filename: string,
  base64: string,
  onBytes?: (sent: number, total: number) => void,
): Promise<string | null> => new Promise((resolve) => {
  try {
    const body = JSON.stringify({ action: 'upload', filename, base64 });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (xhr.upload && onBytes) {
      xhr.upload.onprogress = (e) => onBytes(e.loaded, e.lengthComputable ? e.total : body.length);
    }
    xhr.onload = () => {
      onBytes?.(body.length, body.length);
      try {
        const data = JSON.parse(xhr.responseText);
        resolve(xhr.status >= 200 && xhr.status < 300 && data && data.url ? data.url : null);
      } catch { resolve(null); }
    };
    xhr.onerror = () => resolve(null);
    xhr.send(body);
  } catch (e) {
    console.error('Image upload failed:', e);
    resolve(null);
  }
});

/**
 * Uploads a batch of gallery photos.
 *
 * Doing this one photo at a time meant, per photo: read the whole gallery from
 * the API, upload, then write the whole gallery database back — so a batch of
 * eight cost ~32 sequential round trips and eight full database rewrites. The
 * batch is now read once, uploaded a few photos at a time, and written once.
 */
export const saveGalleryImages = async (
  newImages: Omit<GalleryImage, 'id' | 'col' | 'row_y'>[],
  onProgress?: (p: UploadProgress) => void,
): Promise<GalleryImage[]> => {
  try {
    if (newImages.length === 0) return await getGalleryImages();

    const images = await getGalleryImages();
    const baseStamp = Date.now();
    const t0 = Date.now();
    const total = newImages.length;

    // ── Phase 1: encode. CPU-bound and on the main thread, so it is reported
    // separately — if this is the slow half, the fix is smaller images, not a
    // faster connection.
    let prepared = 0;
    const report = (p: Partial<UploadProgress> & { phase: UploadProgress['phase'] }) =>
      onProgress?.({
        done: 0, total, ratio: 0, sentBytes: 0, totalBytes: 0,
        elapsedMs: Date.now() - t0, etaMs: null, ...p,
      });

    report({ phase: 'preparing', done: 0 });

    const variants = await mapWithConcurrency(newImages, UPLOAD_CONCURRENCY, async (image, i) => {
      const stamp = baseStamp + i; // a batch shares a millisecond; ids must not
      let parts: { filename: string; data: string; key: 'grid' | 'full' }[];

      if (Platform.OS === 'web') {
        // One decode of the original, two encodes from it.
        const [gridData, fullData] = await encodeVariantsWeb(image.uri, [
          { maxDim: GRID_MAX_DIM, quality: GRID_QUALITY },
          { maxDim: FULL_MAX_DIM, quality: FULL_QUALITY },
        ]);
        parts = [
          { filename: `gallery_${stamp}.jpg`, data: gridData, key: 'grid' },
          { filename: `gallery_${stamp}_full.jpg`, data: fullData, key: 'full' },
        ];
      } else {
        parts = [{ filename: `gallery_${stamp}.jpg`, data: image.uri, key: 'grid' }];
      }

      prepared++;
      report({ phase: 'preparing', done: prepared, ratio: (prepared / total) * PHASE_WEIGHT.preparing });
      return { image, stamp, parts };
    });

    const prepareMs = Date.now() - t0;

    // ── Phase 2: upload. Now that every payload exists we know the exact byte
    // total, so the bar can track real transfer instead of a photo counter.
    const uploadStart = Date.now();
    const jobs = variants.flatMap(v => v.parts.map(part => ({ ...part, stamp: v.stamp })));
    const totalBytes = jobs.reduce((sum, j) => sum + dataUrlBytes(j.data), 0);
    const sentPerJob = new Array(jobs.length).fill(0);
    const partsPerPhoto = Math.max(1, jobs.length / total);
    let uploadedJobs = 0;

    const pushUploadProgress = () => {
      const sentBytes = sentPerJob.reduce((a, b) => a + b, 0);
      const frac = totalBytes > 0 ? Math.min(sentBytes / totalBytes, 1) : 1;
      const spent = Date.now() - uploadStart;
      report({
        phase: 'uploading',
        // jobs → photos, so the counter never reads "11/8"
        done: Math.min(Math.floor(uploadedJobs / partsPerPhoto), total),
        sentBytes,
        totalBytes,
        ratio: PHASE_WEIGHT.preparing + frac * PHASE_WEIGHT.uploading,
        etaMs: frac > 0.02 && spent > 400 ? Math.round((spent / frac) * (1 - frac)) : null,
      });
    };
    pushUploadProgress();

    const urls = await mapWithConcurrency(jobs, UPLOAD_CONCURRENCY * 2, async (job, idx) => {
      const url = await uploadImageToVercelBlob(job.data, job.filename, true, (sent, jobTotal) => {
        // XHR reports the JSON body size; scale it onto the image's byte share.
        const share = dataUrlBytes(job.data);
        sentPerJob[idx] = jobTotal > 0 ? Math.min((sent / jobTotal) * share, share) : share;
        pushUploadProgress();
      });
      sentPerJob[idx] = dataUrlBytes(job.data);
      uploadedJobs++;
      pushUploadProgress();
      return url;
    });

    const uploadMs = Date.now() - uploadStart;

    let cursor = 0;
    const uploaded = variants.map(v => {
      const mine = v.parts.map(() => urls[cursor++]);
      const uri = mine[0];
      const fullUri = mine[1] && mine[1] !== mine[0] ? mine[1] : undefined;
      return { ...v.image, uri, fullUri, id: v.stamp.toString() };
    });

    report({ phase: 'saving', done: total, sentBytes: totalBytes, totalBytes, ratio: PHASE_WEIGHT.preparing + PHASE_WEIGHT.uploading });
    const saveStart = Date.now();

    // Masonry bookkeeping, carried forward across the whole batch.
    const colHeights = new Array(NUM_COLS).fill(0);
    images.forEach(img => {
      const bottom = img.row_y + img.height + GAP;
      if (bottom > colHeights[img.col]) colHeights[img.col] = bottom;
    });

    const added: GalleryImage[] = uploaded.map(item => {
      let minCol = 0;
      for (let c = 1; c < NUM_COLS; c++) {
        if (colHeights[c] < colHeights[minCol]) minCol = c;
      }
      const row_y = colHeights[minCol];
      colHeights[minCol] += item.height + GAP;
      const { fullUri, ...rest } = item;
      return { ...rest, ...(fullUri ? { fullUri } : {}), col: minCol, row_y };
    });

    images.push(...added);

    // One database write for the whole batch instead of one per photo.
    await fetchWithFallback('save_gallery', { data: images });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(images));

    const saveMs = Date.now() - saveStart;
    const timings = { prepareMs, uploadMs, saveMs, totalMs: Date.now() - t0, bytes: totalBytes };
    console.log('[gallery upload]', total, 'photos —', JSON.stringify(timings));
    report({ phase: 'done', done: total, sentBytes: totalBytes, totalBytes, ratio: 1, timings });
    return images;
  } catch (error) {
    console.error('Failed to save images', error);
    return [];
  }
};

export const saveGalleryImage = async (image: Omit<GalleryImage, 'id' | 'col' | 'row_y'>) => {
  const images = await saveGalleryImages([image]);
  return images[images.length - 1];
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
  /** Called as bytes leave the browser, for progress reporting. */
  onBytes?: (sent: number, total: number) => void,
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

    // XHR when the caller wants byte-level progress, plain fetch otherwise.
    if (onBytes && typeof XMLHttpRequest !== 'undefined') {
      const url = await postImageWithProgress(apiUrl, filename, base64, onBytes);
      if (url) return url;
      return activeUri;
    }

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

export const saveClientEvent = async (
  event: Omit<ClientEvent, 'id' | 'createdAt'> & { id?: string },
  onProgress?: (p: UploadProgress) => void,
) => {
  try {
    const t0 = Date.now();
    // Photos already living on the CDN cost nothing — only new ones are work.
    const pending = event.images
      .map((uri, i) => ({ uri, i }))
      .filter(({ uri }) => !(uri.startsWith('http') && !uri.includes('localhost')));
    const total = pending.length;

    const report = (p: Partial<UploadProgress> & { phase: UploadProgress['phase'] }) =>
      onProgress?.({
        done: 0, total, ratio: 0, sentBytes: 0, totalBytes: 0,
        elapsedMs: Date.now() - t0, etaMs: null, ...p,
      });

    // ── Phase 1: encode every new photo once, so the byte total is known.
    report({ phase: 'preparing', done: 0 });
    let prepared = 0;
    const payloads = await mapWithConcurrency(pending, UPLOAD_CONCURRENCY, async ({ uri, i }) => {
      const data = Platform.OS === 'web' ? await compressImageWeb(uri) : uri;
      prepared++;
      report({ phase: 'preparing', done: prepared, ratio: (prepared / Math.max(total, 1)) * PHASE_WEIGHT.preparing });
      return { data, i };
    });
    const prepareMs = Date.now() - t0;

    // ── Phase 2: upload them together instead of one at a time.
    const uploadStart = Date.now();
    const totalBytes = payloads.reduce((sum, p) => sum + dataUrlBytes(p.data), 0);
    const sentPerJob = new Array(payloads.length).fill(0);
    let uploadedCount = 0;
    const pushUploadProgress = () => {
      const sentBytes = sentPerJob.reduce((a: number, b: number) => a + b, 0);
      const frac = totalBytes > 0 ? Math.min(sentBytes / totalBytes, 1) : 1;
      const spent = Date.now() - uploadStart;
      report({
        phase: 'uploading', done: uploadedCount, sentBytes, totalBytes,
        ratio: PHASE_WEIGHT.preparing + frac * PHASE_WEIGHT.uploading,
        etaMs: frac > 0.02 && spent > 400 ? Math.round((spent / frac) * (1 - frac)) : null,
      });
    };
    pushUploadProgress();

    const uploadedImages = [...event.images];
    await mapWithConcurrency(payloads, UPLOAD_CONCURRENCY * 2, async (job, idx) => {
      const url = await uploadImageToVercelBlob(
        job.data,
        `event_photo_${job.i + 1}_${Date.now()}.jpg`,
        true,
        (sent, jobTotal) => {
          const share = dataUrlBytes(job.data);
          sentPerJob[idx] = jobTotal > 0 ? Math.min((sent / jobTotal) * share, share) : share;
          pushUploadProgress();
        },
      );
      uploadedImages[job.i] = url;
      sentPerJob[idx] = dataUrlBytes(job.data);
      uploadedCount++;
      pushUploadProgress();
    });
    const uploadMs = Date.now() - uploadStart;

    const sanitizedEvent = {
      ...event,
      images: uploadedImages,
    };

    report({ phase: 'saving', done: total, sentBytes: totalBytes, totalBytes, ratio: PHASE_WEIGHT.preparing + PHASE_WEIGHT.uploading });
    const saveStart = Date.now();

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

    const timings = { prepareMs, uploadMs, saveMs: Date.now() - saveStart, totalMs: Date.now() - t0, bytes: totalBytes };
    console.log('[event save]', total, 'new photos —', JSON.stringify(timings));
    report({ phase: 'done', done: total, sentBytes: totalBytes, totalBytes, ratio: 1, timings });
  } catch (error) {
    console.error('Failed to save client event', error);
    onProgress?.({ phase: 'done', done: 0, total: 0, ratio: 1, sentBytes: 0, totalBytes: 0, elapsedMs: 0, etaMs: null });
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


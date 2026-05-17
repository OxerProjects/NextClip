import AsyncStorage from '@react-native-async-storage/async-storage';

export type GalleryImage = {
  id: string;
  uri: string;
  category: string;
  width: number;
  height: number;
  // Grid position: column index and y offset within that column
  col: number;
  row_y: number;
};

const STORAGE_KEY = '@nextclip_gallery_images';
const IMG_WIDTH = 300;
const GAP = 12;
const NUM_COLS = 8;

// Total width of the grid
export const GRID_TOTAL_WIDTH = NUM_COLS * (IMG_WIDTH + GAP) - GAP;

export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // If old format (has x/y instead of col/row_y), regenerate
      if (parsed.length > 0 && parsed[0].col === undefined) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return generateMockImages();
      }
      return parsed;
    }
    // Return mock images for initial state if empty
    return generateMockImages();
  } catch (error) {
    console.error('Failed to load images', error);
    return [];
  }
};

export const saveGalleryImage = async (image: Omit<GalleryImage, 'id' | 'col' | 'row_y'>) => {
  try {
    const images = await getGalleryImages();
    
    // Rebuild column heights
    const colHeights = new Array(NUM_COLS).fill(0);
    images.forEach(img => {
      const bottom = img.row_y + img.height + GAP;
      if (bottom > colHeights[img.col]) colHeights[img.col] = bottom;
    });

    // Find shortest column
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
    // Find shortest column
    let minCol = 0;
    for (let c = 1; c < NUM_COLS; c++) {
      if (colHeights[c] < colHeights[minCol]) minCol = c;
    }

    // Random height variations for visual interest
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

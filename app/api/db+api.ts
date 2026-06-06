import { ExpoRequest } from 'expo-router/server';
import fs from 'fs/promises';
import path from 'path';

// Define the local path for our JSON database files
const DB_DIR = path.join(process.cwd(), '.nextclip_db');

// Helper to ensure DB directory exists
async function ensureDbDir() {
  try {
    await fs.access(DB_DIR);
  } catch {
    await fs.mkdir(DB_DIR, { recursive: true });
  }
}

// Local Database File Operations
async function readLocalFile(filename: string) {
  try {
    await ensureDbDir();
    const data = await fs.readFile(path.join(DB_DIR, filename), 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeLocalFile(filename: string, data: any) {
  await ensureDbDir();
  await fs.writeFile(path.join(DB_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

// Ensure images directory exists inside public to serve them locally
async function ensureImagesDir() {
  const imgDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await fs.access(imgDir);
  } catch {
    await fs.mkdir(imgDir, { recursive: true });
  }
  return imgDir;
}

// Custom Helper to respond with JSON using standard Web API Response constructor
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: ExpoRequest) {
  try {
    if (!req) {
      return jsonResponse({ error: 'Request object is undefined' }, 400);
    }
    const body = await req.json().catch(() => ({}));
    const { action, data, filename, base64 } = body;

    if (action === 'save_events') {
      await writeLocalFile('events.json', data);
      return jsonResponse({ success: true, local: true });
    }

    if (action === 'save_gallery') {
      await writeLocalFile('gallery.json', data);
      return jsonResponse({ success: true, local: true });
    }
    
    if (action === 'save_leads') {
      await writeLocalFile('leads.json', data);
      return jsonResponse({ success: true, local: true });
    }

    if (action === 'save_bookings') {
      await writeLocalFile('bookings.json', data);
      return jsonResponse({ success: true, local: true });
    }

    if (action === 'upload' && base64) {
      // Local image upload fallback to public/uploads
      const imgDir = await ensureImagesDir();
      const safeFilename = `${Date.now()}_${filename}`;
      const buffer = Buffer.from(base64, 'base64');
      await fs.writeFile(path.join(imgDir, safeFilename), buffer);
      
      // Return the public URL path
      return jsonResponse({ url: `/uploads/${safeFilename}`, local: true });
    }

    // Handle GET actions passed as POST
    if (action === 'get_events') {
      const events = await readLocalFile('events.json');
      return jsonResponse(events || []);
    }
    
    if (action === 'get_gallery') {
      const gallery = await readLocalFile('gallery.json');
      return jsonResponse(gallery || []);
    }
    
    if (action === 'get_leads') {
      const leads = await readLocalFile('leads.json');
      return jsonResponse(leads || []);
    }

    if (action === 'get_bookings') {
      const bookings = await readLocalFile('bookings.json');
      return jsonResponse(bookings || []);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (error: any) {
    console.error('API Route Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

export async function GET(req: ExpoRequest) {
  // Simple check for API health
  return jsonResponse({ status: 'API is running', type: 'local_json' });
}

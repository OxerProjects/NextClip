import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  // Enable CORS so the app can communicate with the serverless function from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured in Vercel environment variables.' });
  }

  try {
    const { action } = req.body || req.query || {};

    if (req.method === 'POST') {
      const { filename, base64, data } = req.body || {};

      // 1. Action: Upload Event Image File
      if (action === 'upload' && base64) {
        const buffer = Buffer.from(base64, 'base64');
        const blob = await put(`events/images/${Date.now()}_${filename}`, buffer, {
          access: 'public',
          contentType: 'image/jpeg',
          token,
        });
        return res.status(200).json(blob);
      }

      // 2. Action: Save Events Array (JSON Database)
      if (action === 'save_events' && data) {
        // Clear any old databases to keep blob storage clean
        try {
          const { blobs } = await list({ prefix: 'database/events.json', token });
          for (const oldBlob of blobs) {
            await del(oldBlob.url, { token });
          }
        } catch (e) {
          console.log('No existing db file to clean up');
        }

        // Put the new JSON database file
        const blob = await put('database/events.json', JSON.stringify(data), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false, // Ensure exact filename so we can list it reliably
          token,
        });
        return res.status(200).json({ success: true, url: blob.url });
      }
    }

    // 3. Action: Get Events Array (JSON Database)
    if (action === 'get_events' || req.method === 'GET') {
      try {
        const { blobs } = await list({ prefix: 'database/events.json', token });
        if (blobs.length > 0) {
          const dbUrl = blobs[0].url;
          // Fetch the database with a cache-busting timestamp
          const response = await fetch(`${dbUrl}?t=${Date.now()}`);
          const events = await response.json();
          return res.status(200).json(events);
        }
      } catch (err) {
        console.error('Failed to read database file, returning empty array', err);
      }
      return res.status(200).json([]);
    }

    return res.status(400).json({ error: 'Invalid action or missing parameters' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

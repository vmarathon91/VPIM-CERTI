// Serverless API Handler for /api/race-photos (Vercel Serverless Function)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url as string;
  const bib = req.query.bib ? String(req.query.bib).toLowerCase().trim() : '';

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter (Google Apps Script URL cho ảnh)' });
  }

  try {
    const fetchUrl = new URL(targetUrl);
    if (bib) {
      fetchUrl.searchParams.set('bib', bib);
    }

    const response = await fetch(fetchUrl.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Google Apps Script ảnh trả về mã lỗi HTTP ${response.status}`,
      });
    }

    const rawText = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Fallback TSV parser if user returned tab-separated text
      const lines = rawText.trim().split(/\r?\n/);
      const list: { bib: string; img: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length >= 2) {
          list.push({ bib: parts[0].trim(), img: parts[1].trim() });
        }
      }
      parsed = { success: true, total: list.length, data: list };
    }

    // Convert Google Drive links to direct stream links and flatten comma/newline separated URLs
    const splitAndNormalize = (urls: (string | any)[]): string[] => {
      const out: string[] = [];
      for (const item of urls) {
        if (!item) continue;
        const raw = typeof item === 'string' ? item : (item.img || item.url || '');
        if (!raw) continue;
        const pieces = raw.split(/[\n,;]+/);
        for (const p of pieces) {
          const trimmed = p.trim();
          if (!trimmed) continue;
          const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            out.push(`https://lh3.googleusercontent.com/d/${match[1]}`);
          } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            out.push(trimmed);
          }
        }
      }
      return out;
    };

    if (parsed) {
      if (Array.isArray(parsed.photos)) {
        parsed.photos = splitAndNormalize(parsed.photos);
      }
      if (Array.isArray(parsed.data)) {
        const expandedData: { bib: string; img: string }[] = [];
        for (const item of parsed.data) {
          const itemUrls = splitAndNormalize([item.img || item.url || '']);
          for (const u of itemUrls) {
            expandedData.push({ bib: item.bib, img: u });
          }
        }
        parsed.data = expandedData;
      }
      if (parsed.photosByBib && typeof parsed.photosByBib === 'object') {
        for (const k of Object.keys(parsed.photosByBib)) {
          if (Array.isArray(parsed.photosByBib[k])) {
            parsed.photosByBib[k] = splitAndNormalize(parsed.photosByBib[k]);
          }
        }
      }
    }

    // Set cache header on Vercel CDN: 120 seconds
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.json(parsed);
  } catch (err: any) {
    console.warn('[Vercel Serverless /api/race-photos] Error:', err);
    return res.status(500).json({ error: err.message || 'Lỗi khi tải danh sách ảnh thi đấu' });
  }
}

export default async function handler(req: any, res: any) {
  let targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // If Google Drive link, extract fileId and convert to direct link
    if (targetUrl.includes('drive.google.com')) {
      let fileId = '';
      const matchFile = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const matchId = targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchFile && matchFile[1]) {
        fileId = matchFile[1];
      } else if (matchId && matchId[1]) {
        fileId = matchId[1];
      }

      if (fileId) {
        targetUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    const imgResp = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (!imgResp.ok) {
      if (targetUrl.includes('googleusercontent.com/d/')) {
        const fileId = targetUrl.split('/').pop();
        const fallbackUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const fallbackResp = await fetch(fallbackUrl);
        if (fallbackResp.ok) {
          const buffer = Buffer.from(await fallbackResp.arrayBuffer());
          const contentType = fallbackResp.headers.get('content-type') || 'image/png';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buffer);
        }
      }
      return res.status(imgResp.status).send(`Failed to fetch image: HTTP ${imgResp.status}`);
    }

    const contentType = imgResp.headers.get('content-type') || 'image/png';
    const arrayBuffer = await imgResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

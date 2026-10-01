// Serverless API Handler for /api/log-download (Vercel Serverless Function)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {}
  }
  if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
    body = req.query || {};
  }

  const { timestamp, bib, race, time, scriptUrl } = body || {};

  const targetScriptUrl =
    scriptUrl ||
    process.env.CHECKING_APPS_SCRIPT_URL ||
    process.env.MARATHON_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbycDYjQwUGhF_OmEm-nledEXPUdxGiTYZFuwpnyGFvYYsDevZlDRx4fvnSHbwdLpfJG/exec';

  if (!targetScriptUrl) {
    return res.status(400).json({ error: 'Missing target Google Apps Script URL for checking log' });
  }

  try {
    const payload = {
      action: 'checking',
      TIMESTAMP: timestamp || new Date().toISOString(),
      BIB: bib || '',
      RACE: race || '',
      TIME: time || '',
      timestamp: timestamp || new Date().toISOString(),
      bib: bib || '',
      race: race || '',
      time: time || '',
    };

    const upstreamRes = await fetch(targetScriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      body: JSON.stringify(payload),
    });

    const text = await upstreamRes.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}

    return res.json({
      success: upstreamRes.ok,
      status: upstreamRes.status,
      data: json || text,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi khi gửi log tải ảnh' });
  }
}

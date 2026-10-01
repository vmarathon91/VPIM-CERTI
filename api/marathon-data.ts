// Serverless API Handler for /api/marathon-data
const MARATHON_SECRET_KEY = process.env.MARATHON_SECRET_KEY || 'ducbm900966559155';
const MARATHON_APPS_SCRIPT_URL =
  process.env.MARATHON_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwwY2MgGaURMrB20UHGVvUZ3INSOrkd8jIQok1JpnDTWMzblecdDOdDTn7qtrbtPPzquw/exec';

function parseTSVData(tsvText: string): any[] {
  const lines = tsvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map((h) => h.trim().toLowerCase());

  const findCol = (keywords: string[], defIdx: number) => {
    for (let i = 0; i < headers.length; i++) {
      if (keywords.some((kw) => headers[i].includes(kw))) return i;
    }
    return defIdx;
  };

  const colBib = findCol(['bib', 'số bib'], 0);
  const colName = findCol(['tên', 'name', 'họ tên', 'athlete', 'vdv'], 1);
  const colGender = findCol(['giới tính', 'gender', 'sex'], 2);
  const colDistance = findCol(['cự ly', 'distance', 'dist'], 3);
  const colOverallRank = findCol(['overall', 'toàn đoàn', 'hạng chung', 'chung'], 4);
  const colGenderRank = findCol(['gender rank', 'giới tính rank', 'hạng giới tính'], 5);
  const colAG = findCol(['ag', 'nhóm tuổi', 'age group', 'lứa tuổi'], 6);
  const colAgeGroupRank = findCol(['age group rank', 'hạng lứa tuổi', 'hạng nhóm tuổi', 'hạng ag'], 7);
  const colGun = findCol(['guntime', 'gun time', 'gun', 'thời gian gun'], 8);
  const colChip = findCol(['chiptime', 'chip time', 'chip', 'net time', 'thời gian chip'], 9);
  const colPhoto = findCol(['ảnh', 'photo', 'image', 'avatar'], -1);
  const colStart = findCol(['start', 'xuất phát', 'bắt đầu'], -1);
  const colCP1 = findCol(['cp1', 'cp 1', 'checkpoint 1'], -1);
  const colCP1Pace = findCol(['cp1.pace', 'cp1 pace', 'pace cp1', 'cp1_pace'], -1);
  const colCP2 = findCol(['cp2', 'cp 2', 'checkpoint 2'], -1);
  const colCP2Pace = findCol(['cp2.pace', 'cp2 pace', 'pace cp2', 'cp2_pace'], -1);
  const colCP3 = findCol(['cp3', 'cp 3', 'checkpoint 3'], -1);
  const colCP3Pace = findCol(['cp3.pace', 'cp3 pace', 'pace cp3', 'cp3_pace'], -1);
  const colAvgPace = findCol(['average pace', 'avg pace', 'pace tb', 'pace'], -1);

  const normalizeDistance = (dist: string, bib: string): string => {
    const d = (dist || '').trim();
    const upper = d.toUpperCase();
    if (upper === 'M' || upper === 'F') {
      const firstDigit = bib.trim().charAt(0);
      if (firstDigit === '9') return 'Full Marathon';
      if (firstDigit === '8') return 'Half Marathon';
      if (firstDigit === '6' || firstDigit === '1') return '10KM';
      if (firstDigit === '5') return '5KM';
      return 'Full Marathon';
    }
    if (upper.includes('HALF') || upper === 'HM' || upper === '21K' || upper === '21KM') return 'Half Marathon';
    if (upper.includes('FULL') || upper === 'FM' || upper === '42K' || upper === '42KM') return 'Full Marathon';
    if (upper === '10K' || upper === '10KM') return '10KM';
    if (upper === '5K' || upper === '5KM') return '5KM';
    return d || 'Half Marathon';
  };

  const runners: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map((c) => c.trim());
    const bib = cols[colBib] || '';
    const name = cols[colName] || '';
    if (!bib && !name) continue;

    const rawGender = cols[colGender] || 'M';
    const gUpper = rawGender.trim().toUpperCase();
    const gender = gUpper.startsWith('F') || gUpper.includes('NỮ') ? 'F' : 'M';
    const dist = normalizeDistance(cols[colDistance] || 'Half Marathon', bib);

    runners.push({
      bib,
      name,
      gender,
      distance: dist,
      distanceDisplay: `Đã hoàn thành | Has Completed ${dist}`,
      overallRank: cols[colOverallRank] || '-',
      genderRank: cols[colGenderRank] || '-',
      ag: cols[colAG] || '-',
      ageGroupRank: cols[colAgeGroupRank] || '-',
      gunTime: cols[colGun] || '--:--:--',
      chipTime: cols[colChip] || '--:--:--',
      date: '13/09/2026',
      photoUrl: colPhoto !== -1 ? cols[colPhoto] : undefined,
      startTime: colStart !== -1 ? cols[colStart] : undefined,
      cp1: colCP1 !== -1 ? cols[colCP1] : undefined,
      cp1Pace: colCP1Pace !== -1 ? cols[colCP1Pace] : undefined,
      cp2: colCP2 !== -1 ? cols[colCP2] : undefined,
      cp2Pace: colCP2Pace !== -1 ? cols[colCP2Pace] : undefined,
      cp3: colCP3 !== -1 ? cols[colCP3] : undefined,
      cp3Pace: colCP3Pace !== -1 ? cols[colCP3Pace] : undefined,
      avgPace: colAvgPace !== -1 ? cols[colAvgPace] : undefined,
    });
  }

  return runners;
}

export default async function handler(req: any, res: any) {
  // Add CORS and Cache headers for Vercel Serverless Edge CDN
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const targetUrl = new URL(MARATHON_APPS_SCRIPT_URL);
    targetUrl.searchParams.set('key', MARATHON_SECRET_KEY);
    if (req.query?.search) {
      targetUrl.searchParams.set('search', String(req.query.search));
    }
    if (req.query?.bib) {
      targetUrl.searchParams.set('bib', String(req.query.bib));
    }

    const upstreamRes = await fetch(targetUrl.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!upstreamRes.ok && upstreamRes.status !== 200) {
      return res.status(upstreamRes.status).json({
        error: `Google Apps Script returned HTTP ${upstreamRes.status}`,
      });
    }

    const rawText = await upstreamRes.text();
    if (rawText.includes('403 Forbidden') || rawText.includes('Access Denied')) {
      return res.status(403).json({
        error: '403 Forbidden: Mã Secret Key không hợp lệ hoặc bị từ chối truy cập.',
      });
    }

    // Cache successful responses for 2 minutes on Vercel CDN to avoid cold start quotas & timeout
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');

    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawText);
        const list = Array.isArray(parsed) ? parsed : (parsed.data || parsed.runners || []);
        return res.json({
          success: true,
          total: list.length,
          data: list,
          runners: list,
          backgroundUrl: parsed.backgroundUrl || 'https://drive.google.com/file/d/17cfwL9HAxh2_tRgvdMp66URxzh6wLj46/view?usp=sharing',
          logoUrl: parsed.logoUrl || 'https://drive.google.com/file/d/11LiU5-V7V5NyDwqtE7bD7MC_-qkttZNE/view?usp=sharing',
        });
      } catch {
        // fallback
      }
    }

    const runners = parseTSVData(rawText);
    return res.json({
      success: true,
      total: runners.length,
      data: runners,
      runners: runners,
      backgroundUrl: 'https://drive.google.com/file/d/17cfwL9HAxh2_tRgvdMp66URxzh6wLj46/view?usp=sharing',
      logoUrl: 'https://drive.google.com/file/d/11LiU5-V7V5NyDwqtE7bD7MC_-qkttZNE/view?usp=sharing',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching marathon data' });
  }
}

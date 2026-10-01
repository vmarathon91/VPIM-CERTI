import { Runner, DataSourceSettings } from '../types';
import { INITIAL_RUNNERS } from '../data/mockRunners';
import { getRunnerSplitData } from '../utils/runnerSplits';
import { fetchRunnersFromSupabase, getGlobalSupabaseConfig } from './supabaseService';

const SETTINGS_KEY = 'vm_quynhon_datasource_settings';
const RUNNERS_CACHE_KEY = 'vm_quynhon_runners_cache';

export const MARATHON_PROXY_ENDPOINT = '/api/marathon-data';
export const USER_APPS_SCRIPT_URL = '/api/marathon-data';
export const DIRECT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwwY2MgGaURMrB20UHGVvUZ3INSOrkd8jIQok1JpnDTWMzblecdDOdDTn7qtrbtPPzquw/exec?key=ducbm900966559155';

export const getDirectGoogleDriveImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
};

export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút (1,800,000 ms)

interface CachedRunnersPayload {
  timestamp: number;
  runners: Runner[];
  backgroundUrl?: string | null;
  logoUrl?: string | null;
}

export const getCachedRunners = (prefix: string = 'vm_quynhon', ignoreExpiration: boolean = false): Runner[] | null => {
  const cacheKey = `${prefix}_runners_cache`;
  const legacyKey = `${prefix}_cached_runners`;
  try {
    const raw = localStorage.getItem(cacheKey) || localStorage.getItem(legacyKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    // Định dạng mới có timestamp TTL
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.runners)) {
      const age = Date.now() - (parsed.timestamp || 0);
      if (ignoreExpiration || age < CACHE_TTL_MS) {
        return parsed.runners;
      }
      return null; // Đã quá 30 phút
    }

    // Định dạng mảng cũ
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error reading cached runners:', e);
  }
  return null;
};

export const getCachedRunnersFull = (prefix: string = 'vm_quynhon', ignoreExpiration: boolean = false): CachedRunnersPayload | null => {
  const cacheKey = `${prefix}_runners_cache`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.runners)) {
      const age = Date.now() - (parsed.timestamp || 0);
      if (ignoreExpiration || age < CACHE_TTL_MS) {
        return parsed;
      }
      return null;
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { timestamp: Date.now(), runners: parsed };
    }
  } catch {}
  return null;
};

export const clearRunnersCache = (prefix: string = 'vm_quynhon') => {
  try {
    localStorage.removeItem(`${prefix}_runners_cache`);
    localStorage.removeItem(`${prefix}_cached_runners`);
  } catch {}
};

export const getSavedDataSourceSettings = (prefix: string = 'vm_quynhon'): DataSourceSettings => {
  const settingsKey = `${prefix}_datasource_settings`;
  try {
    const saved = localStorage.getItem(settingsKey);
    if (saved) {
      const parsed: DataSourceSettings = JSON.parse(saved);
      return parsed;
    }
  } catch (e) {
    console.error('Error reading datasource settings:', e);
  }
  return {
    type: 'appsScript',
    url: MARATHON_PROXY_ENDPOINT,
  };
};

export const saveDataSourceSettings = (settings: DataSourceSettings, prefix: string = 'vm_quynhon') => {
  const settingsKey = `${prefix}_datasource_settings`;
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving datasource settings:', e);
  }
};

export const parseCSV = (csvText: string): Runner[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter (TSV or CSV)
  const isTSV = lines[0].includes('\t');
  const delimiter = isTSV ? '\t' : ',';

  const headers = isTSV
    ? lines[0].split('\t').map((h) => h.trim().toLowerCase())
    : lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const findIdx = (names: string[], defIdx: number) => {
    for (let i = 0; i < headers.length; i++) {
      if (names.some((name) => headers[i].includes(name))) {
        return i;
      }
    }
    return defIdx;
  };

  const bibIdx = findIdx(['bib', 'số bib'], 0);
  const nameIdx = findIdx(['tên', 'name', 'athlete', 'vdv', 'họ tên'], 1);
  const genderIdx = findIdx(['giới tính', 'gender', 'sex'], 2);
  const distIdx = findIdx(['cự ly', 'dist', 'distance'], 3);
  const overallRankIdx = findIdx(['overall', 'chung', 'toàn đoàn'], 4);
  const genderRankIdx = findIdx(['gender rank', 'giới tính rank', 'hạng giới tính'], 5);
  const agIdx = findIdx(['ag', 'age group', 'nhóm tuổi', 'lứa tuổi'], 6);
  const agRankIdx = findIdx(['age group rank', 'hạng lứa tuổi', 'hạng ag'], 7);
  const gunIdx = findIdx(['gun', 'guntime', 'gun time'], 8);
  const chipIdx = findIdx(['chip', 'net', 'chiptime', 'chip time'], 9);
  const photoIdx = findIdx(['ảnh', 'photo', 'image', 'avatar'], 10);
  const startIdx = findIdx(['start', 'xuất phát', 'bắt đầu'], -1);
  const cp1Idx = findIdx(['cp1', 'cp 1', 'checkpoint 1'], -1);
  const cp1PaceIdx = findIdx(['cp1.pace', 'cp1 pace', 'pace cp1', 'cp1_pace'], -1);
  const cp2Idx = findIdx(['cp2', 'cp 2', 'checkpoint 2'], -1);
  const cp2PaceIdx = findIdx(['cp2.pace', 'cp2 pace', 'pace cp2', 'cp2_pace'], -1);
  const cp3Idx = findIdx(['cp3', 'cp 3', 'checkpoint 3'], -1);
  const cp3PaceIdx = findIdx(['cp3.pace', 'cp3 pace', 'pace cp3', 'cp3_pace'], -1);
  const avgPaceIdx = findIdx(['average pace', 'avg pace', 'pace tb', 'pace'], -1);

  const runners: Runner[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = isTSV
      ? line.split('\t').map((col) => col.trim())
      : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((col) => col.trim().replace(/^"|"$/g, ''));

    const bib = cols[bibIdx] || '';
    const name = cols[nameIdx] || '';
    if (!bib && !name) continue;

    const rawGender = cols[genderIdx] || 'M';
    const gUpper = rawGender.trim().toUpperCase();
    const gender = gUpper.startsWith('F') || gUpper.includes('NỮ') ? 'F' : 'M';

    const rawDist = (cols[distIdx] || '').trim();
    const distance = rawDist || (bib.startsWith('9') ? '42K' : bib.startsWith('8') ? '21K' : bib.startsWith('6') || bib.startsWith('1') ? '10K' : '5K');
    const gunTime = cols[gunIdx] || '--:--:--';
    const chipTime = cols[chipIdx] || '--:--:--';

    const baseRunner: Runner = {
      bib,
      name,
      gender,
      distance,
      distanceDisplay: distance,
      overallRank: cols[overallRankIdx] || '-',
      genderRank: cols[genderRankIdx] || '-',
      ag: cols[agIdx] || '-',
      ageGroupRank: cols[agRankIdx] || '-',
      gunTime,
      chipTime,
      date: '13/09/2026',
      photoUrl: cols[photoIdx] || undefined,
      startTime: startIdx !== -1 ? cols[startIdx] : undefined,
      cp1: cp1Idx !== -1 ? cols[cp1Idx] : undefined,
      cp1Pace: cp1PaceIdx !== -1 ? cols[cp1PaceIdx] : undefined,
      cp2: cp2Idx !== -1 ? cols[cp2Idx] : undefined,
      cp2Pace: cp2PaceIdx !== -1 ? cols[cp2PaceIdx] : undefined,
      cp3: cp3Idx !== -1 ? cols[cp3Idx] : undefined,
      cp3Pace: cp3PaceIdx !== -1 ? cols[cp3PaceIdx] : undefined,
      avgPace: avgPaceIdx !== -1 ? cols[avgPaceIdx] : undefined,
    };

    // Calculate CP splits if missing
    const splits = getRunnerSplitData(baseRunner);
    baseRunner.startTime = baseRunner.startTime || splits.startTime;
    baseRunner.cp1 = baseRunner.cp1 || splits.cp1;
    baseRunner.cp1Pace = baseRunner.cp1Pace || splits.cp1Pace;
    baseRunner.cp2 = baseRunner.cp2 || splits.cp2;
    baseRunner.cp2Pace = baseRunner.cp2Pace || splits.cp2Pace;
    baseRunner.cp3 = baseRunner.cp3 || splits.cp3;
    baseRunner.cp3Pace = baseRunner.cp3Pace || splits.cp3Pace;
    baseRunner.avgPace = baseRunner.avgPace || splits.avgPace;
    baseRunner.finishPace = baseRunner.finishPace || splits.finishPace;

    runners.push(baseRunner);
  }

  return runners;
};

export const fetchRunnersFromSource = async (
  settings: DataSourceSettings,
  prefix: string = 'vm_quynhon',
  fallbackRunners: Runner[] = INITIAL_RUNNERS,
  forceRefresh: boolean = false
): Promise<{ runners: Runner[]; error?: string; backgroundUrl?: string | null; logoUrl?: string | null; fromCache?: boolean }> => {
  const cacheKey = `${prefix}_runners_cache`;

  // 1. Kiểm tra Cache 30 phút trong localStorage trước khi gọi mạng/script
  // Nếu chưa quá 30 phút và không yêu cầu cưỡng chế làm mới (forceRefresh = false), dùng ngay cache!
  if (!forceRefresh) {
    const cachedFull = getCachedRunnersFull(prefix, false);
    if (cachedFull && cachedFull.runners && cachedFull.runners.length > 0) {
      return {
        runners: cachedFull.runners,
        backgroundUrl: cachedFull.backgroundUrl,
        logoUrl: cachedFull.logoUrl,
        fromCache: true,
      };
    }
  }

  // 2. Nguồn dữ liệu Supabase
  const globalSb = getGlobalSupabaseConfig();
  const effectiveSb = settings.supabase || (globalSb.url && globalSb.anonKey ? globalSb : undefined);

  if (settings.type === 'supabase' || effectiveSb?.url) {
    if (effectiveSb && effectiveSb.url && effectiveSb.anonKey) {
      const sbRes = await fetchRunnersFromSupabase(effectiveSb, effectiveSb.raceValue);
      if (sbRes.runners && sbRes.runners.length > 0) {
        const payload: CachedRunnersPayload = {
          timestamp: Date.now(),
          runners: sbRes.runners,
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(payload));
          localStorage.setItem(`${prefix}_cached_runners`, JSON.stringify(sbRes.runners));
        } catch {}
        return {
          runners: sbRes.runners,
          fromCache: false,
        };
      } else if (sbRes.error) {
        // Fallback to cache if available
        const fallbackCached = getCachedRunners(prefix, true);
        if (fallbackCached && fallbackCached.length > 0) {
          return {
            runners: fallbackCached,
            error: `${sbRes.error} (Đang dùng ${fallbackCached.length} VĐV từ bộ nhớ tạm)`,
            fromCache: true,
          };
        }
        return {
          runners: fallbackRunners,
          error: sbRes.error,
          fromCache: false,
        };
      }
    }
  }

  if (settings.type === 'mock' || !settings.url.trim()) {
    return { runners: fallbackRunners };
  }

  try {
    const url = settings.url.trim();
    let data: any = null;
    let fetchErrorMsg = '';

    // If no URL or placeholder/invalid URL (e.g. "test", "test2")
    if (!url || (!url.startsWith('/') && !/^https?:\/\//i.test(url))) {
      return {
        runners: INITIAL_RUNNERS,
        fromCache: false,
      };
    }

    // Direct backend proxy endpoint /api/marathon-data
    if (url === '/api/marathon-data' || url.startsWith('/api/marathon-data')) {
      let isJson = false;
      try {
        const resp = await fetch(url);
        const text = await resp.text();
        const trimmed = text.trim();
        if (resp.ok && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
          data = JSON.parse(trimmed);
          isJson = true;
        }
      } catch {
        // Backend not available (e.g. running on static web hosting)
      }

      // If backend API returned HTML (like 404/index.html on static hosting) or wasn't valid JSON
      if (!isJson || !data) {
        try {
          const directResp = await fetch(DIRECT_APPS_SCRIPT_URL);
          const directText = await directResp.text();
          const directTrimmed = directText.trim();
          if (directTrimmed.startsWith('{') || directTrimmed.startsWith('[')) {
            data = JSON.parse(directTrimmed);
          } else {
            throw new Error('Dữ liệu từ Apps Script không phải định dạng JSON hợp lệ.');
          }
        } catch (directErr: any) {
          throw new Error('Không thể kết nối đến máy chủ hoặc Apps Script để tải dữ liệu.');
        }
      }
    } else if (settings.type === 'csvUrl' || url.includes('format=csv') || url.endsWith('.csv')) {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} khi tải file CSV`);
      }
      const text = await resp.text();
      const runners = parseCSV(text);
      if (runners.length === 0) {
        throw new Error('File CSV không có bản ghi hợp lệ nào.');
      }
      localStorage.setItem(RUNNERS_CACHE_KEY, JSON.stringify(runners));
      return { runners };
    } else {
      // Otherwise treat as external Apps Script or JSON API with proxy-sheet fallback
      // First try proxy endpoint to safely bypass browser CORS and follow Google redirects
      try {
        const forceParam = forceRefresh ? '&force=true' : '';
        const proxyResp = await fetch(`/api/proxy-sheet?url=${encodeURIComponent(url)}${forceParam}`);
        const text = await proxyResp.text();
        try {
          data = JSON.parse(text);
          if (data && data.error && !Array.isArray(data.data) && !Array.isArray(data.runners) && !Array.isArray(data)) {
            throw new Error(data.error);
          }
        } catch (parseErr: any) {
          if (
            text.includes('accounts.google.com/ServiceLogin') ||
            text.includes('需要存取權') ||
            text.includes('action="https://accounts.google.com')
          ) {
            throw new Error('Dữ liệu đang được đồng bộ hóa từ máy chủ. Vui lòng thử lại sau.');
          }
          throw new Error(parseErr.message || 'Không thể đồng bộ dữ liệu lúc này.');
        }
      } catch (proxyErr: any) {
        fetchErrorMsg = proxyErr.message || '';
        // Fallback to direct fetch
        try {
          const resp = await fetch(url);
          const text = await resp.text();
          try {
            data = JSON.parse(text);
          } catch {
            if (
              text.includes('accounts.google.com/ServiceLogin') ||
              text.includes('需要存取權') ||
              text.includes('action="https://accounts.google.com')
            ) {
              throw new Error('Dữ liệu đang được đồng bộ hóa từ máy chủ. Vui lòng thử lại sau.');
            }
            throw new Error('Không thể đồng bộ dữ liệu lúc này.');
          }
        } catch (directErr: any) {
          throw new Error('Không thể tải dữ liệu lúc này. Vui lòng bấm Tải lại.');
        }
      }
    }

    let list: Runner[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && Array.isArray(data.data)) {
      list = data.data;
    } else if (data && data.runners) {
      list = data.runners;
    } else {
      throw new Error('Định dạng dữ liệu JSON không đúng cấu trúc danh sách vận động viên.');
    }

    const normalizeDistance = (dist: string, bib: string): string => {
      const d = (dist || '').trim();
      // Keep exact raw text from Google Sheet if provided (e.g. 21K, 42K, 10K, 5K)
      if (d) {
        const upper = d.toUpperCase();
        if (upper === 'M' || upper === 'F') {
          const firstDigit = bib.trim().charAt(0);
          if (firstDigit === '9') return '42K';
          if (firstDigit === '8') return '21K';
          if (firstDigit === '6' || firstDigit === '1') return '10K';
          if (firstDigit === '5') return '5K';
          return '42K';
        }
        return d;
      }
      const firstDigit = bib.trim().charAt(0);
      if (firstDigit === '9') return '42K';
      if (firstDigit === '8') return '21K';
      if (firstDigit === '6' || firstDigit === '1') return '10K';
      if (firstDigit === '5') return '5K';
      return '21K';
    };

    // Format & normalize fields
    const formatted: Runner[] = list.map((r: any, idx) => {
      const bibStr = String(r.bib || idx + 1000).trim();
      const distClean = normalizeDistance(String(r.distance || ''), bibStr);

      const rawRunner: Runner = {
        bib: bibStr,
        name: String(r.name || 'Vận động viên').trim(),
        gender: String(r.gender || 'M').toUpperCase().includes('F') ? 'F' : 'M',
        distance: distClean,
        distanceDisplay: distClean,
        overallRank: r.overallRank ?? '-',
        genderRank: r.genderRank ?? '-',
        ag: String(r.ag ?? '-').trim(),
        ageGroupRank: r.ageGroupRank ?? '-',
        gunTime: String(r.gunTime || '--:--:--').trim(),
        chipTime: String(r.chipTime || '--:--:--').trim(),
        date: r.date || '13/09/2026',
        photoUrl: r.photoUrl || r.photo || r.image || undefined,
        startTime: r.startTime || r.start || r['xuất phát'] || r['bắt đầu'] || undefined,
        cp1: r.cp1 || r['cp 1'] || r.checkpoint1 || undefined,
        cp1Pace: r.cp1Pace || r['cp1.pace'] || r['cp1 pace'] || r['pace cp1'] || r.cp1_pace || undefined,
        cp2: r.cp2 || r['cp 2'] || r.checkpoint2 || undefined,
        cp2Pace: r.cp2Pace || r['cp2.pace'] || r['cp2 pace'] || r['pace cp2'] || r.cp2_pace || undefined,
        cp3: r.cp3 || r['cp 3'] || r.checkpoint3 || undefined,
        cp3Pace: r.cp3Pace || r['cp3.pace'] || r['cp3 pace'] || r['pace cp3'] || r.cp3_pace || undefined,
        avgPace: r.avgPace || r.averagePace || r['avg pace'] || r['average pace'] || r['average.pace'] || r.pace || undefined,
        finishPace: r.finishPace || r['finish pace'] || r['pace finish'] || undefined,
      };

      // Fill in CP calculations if any were missing
      const splits = getRunnerSplitData(rawRunner);
      rawRunner.startTime = rawRunner.startTime || splits.startTime;
      rawRunner.cp1 = rawRunner.cp1 || splits.cp1;
      rawRunner.cp1Pace = rawRunner.cp1Pace || splits.cp1Pace;
      rawRunner.cp2 = rawRunner.cp2 || splits.cp2;
      rawRunner.cp2Pace = rawRunner.cp2Pace || splits.cp2Pace;
      rawRunner.cp3 = rawRunner.cp3 || splits.cp3;
      rawRunner.cp3Pace = rawRunner.cp3Pace || splits.cp3Pace;
      rawRunner.avgPace = rawRunner.avgPace || splits.avgPace;
      rawRunner.finishPace = rawRunner.finishPace || splits.finishPace;

      return rawRunner;
    });

    const bgUrl = data && data.backgroundUrl ? String(data.backgroundUrl).trim() : null;
    const logoUrl = data && (data.logoUrl || data.logo) ? String(data.logoUrl || data.logo).trim() : null;

    // Lưu vào localStorage kèm timestamp phục vụ TTL 30 phút
    const payload: CachedRunnersPayload = {
      timestamp: Date.now(),
      runners: formatted,
      backgroundUrl: bgUrl,
      logoUrl: logoUrl,
    };
    try {
      localStorage.setItem(cacheKey, JSON.stringify(payload));
      localStorage.setItem(`${prefix}_cached_runners`, JSON.stringify(formatted));
    } catch {}

    return { runners: formatted, backgroundUrl: bgUrl, logoUrl };
  } catch (err: any) {
    console.warn('Lỗi khi cập nhật dữ liệu vận động viên từ Google Sheet:', err.message);
    // Kiểm tra bộ nhớ tạm (localStorage)
    try {
      const fallbackCached = getCachedRunners(prefix, true);
      if (fallbackCached && fallbackCached.length > 0) {
        return {
          runners: fallbackCached,
          error: forceRefresh ? `Không thể kết nối đến Google Sheet lúc này, đang dùng ${fallbackCached.length} VĐV trong bộ nhớ tạm.` : undefined,
          fromCache: true,
        };
      }
    } catch {
      // ignore
    }
    return { runners: fallbackRunners, error: err.message || 'Lỗi kết nối nguồn dữ liệu' };
  }
};

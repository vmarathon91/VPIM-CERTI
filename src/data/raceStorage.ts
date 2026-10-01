import { Race, RACES, DEFAULT_RACE, ensureRaceRunners } from './races';
import { CertificatePlacements } from '../types';

const STORAGE_KEY_RACES = 'vm_custom_races_list_v1';

export interface CreateRacePayload {
  name: string;
  slug: string;
  code?: string;
  defaultBgUrl: string;
  appsScriptUrl?: string;
  photosScriptUrl?: string;
  checkingScriptUrl?: string;
  city?: string;
  province?: string;
  date?: string;
  description?: string;
  placements?: CertificatePlacements;
}

/**
 * Lấy danh sách toàn bộ các giải đấu từ static bundled config và localStorage
 * Ưu tiên các file JSON tĩnh trong thư mục public/races/ trước
 */
export function getLocalRaces(): Race[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('vm_all_races_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(ensureRaceRunners);
        }
      }
    } catch {}
  }
  return RACES.map(ensureRaceRunners);
}

/**
 * Tải danh sách giải đấu từ backend API (/api/races) hoặc file tĩnh races-data.json
 * Ưu tiên gọi /api/races trước để backend quét thời gian thực thư mục public/races/
 * Nhờ đó khi người dùng xoá hoặc thêm file .json trong public/races/, hệ thống sẽ đồng bộ ngay lập tức!
 */
export async function fetchAllRaces(): Promise<Race[]> {
  const saveCache = (races: Race[]) => {
    if (typeof window !== 'undefined' && Array.isArray(races)) {
      try {
        localStorage.setItem('vm_all_races_cache_v2', JSON.stringify(races));
      } catch {}
    }
  };

  // 1. Thử gọi API backend (/api/races) trước để server quét thực tế thư mục public/races/
  try {
    const resp = await fetch('/api/races?t=' + Date.now());
    if (resp.ok) {
      const data: Race[] = await resp.json();
      if (Array.isArray(data)) {
        const res = data.map(ensureRaceRunners);
        saveCache(res);
        return res;
      }
    }
  } catch (err) {
    console.warn('Không thể tải danh sách giải từ API, dùng static fallback:', err);
  }

  // 2. Fallback tải file tĩnh public/races-data.json (khi deploy tĩnh không có backend server)
  try {
    const staticResp = await fetch('/races-data.json?t=' + Date.now());
    if (staticResp.ok) {
      const staticData: Race[] = await staticResp.json();
      if (Array.isArray(staticData)) {
        const res = staticData.map(ensureRaceRunners);
        saveCache(res);
        return res;
      }
    }
  } catch {}

  return getLocalRaces();
}

/**
 * Phân giải giải đấu dựa trên đường dẫn URL (pathname, hash, query)
 */
export function resolveRaceFromPath(pathStr: string, raceList: Race[] = getLocalRaces()): Race {
  if (!pathStr || raceList.length === 0) return ensureRaceRunners(raceList[0] || DEFAULT_RACE);

  const clean = pathStr.toLowerCase();

  const normalizeKey = (s: string) =>
    s
      .toLowerCase()
      .replace(/^race_api_/, '')
      .replace(/\.json$/, '')
      .replace(/[^a-z0-9]/g, '');

  const matchRace = (candidate: string): Race | undefined => {
    if (!candidate || candidate === 'admin' || candidate === 'api') return undefined;
    const cleanCand = candidate.replace(/^race_api_/, '').replace(/\.json$/, '');
    const normCand = normalizeKey(candidate);

    return raceList.find((r) => {
      const rSlug = r.slug.toLowerCase();
      const rId = r.id.toLowerCase();
      const rCode = (r.code || '').toLowerCase();
      return (
        rSlug === cleanCand ||
        rId === cleanCand ||
        rCode === cleanCand ||
        normalizeKey(rSlug) === normCand ||
        normalizeKey(rId) === normCand ||
        normalizeKey(r.name) === normCand
      );
    });
  };

  // 1. Kiểm tra query ?race=slug hoặc ?r=slug
  const queryMatch = clean.match(/[?&](?:race|r)=([a-z0-9_.-]+)/);
  if (queryMatch && queryMatch[1]) {
    const found = matchRace(queryMatch[1]);
    if (found) return ensureRaceRunners(found);
  }

  // 2. Kiểm tra hash #slug
  const hashMatch = clean.match(/#([a-z0-9_.-]+)/);
  if (hashMatch && hashMatch[1]) {
    const found = matchRace(hashMatch[1]);
    if (found) return ensureRaceRunners(found);
  }

  // 3. Kiểm tra pathname /ha-long-2026 hoặc /vnexpress-marathon-grand-tour-nghe-an-2026
  const pathname = clean.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
  if (pathname) {
    const found = matchRace(pathname);
    if (found) return ensureRaceRunners(found);
  }

  return ensureRaceRunners(raceList[0] || DEFAULT_RACE);
}

/**
 * Kiểm tra kết nối thử nghiệm đến Google Apps Script
 */
export async function testScriptConnection(scriptUrl: string): Promise<{ success: boolean; count?: number; message: string; sample?: any }> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return { success: false, message: 'Vui lòng nhập đường link Google Apps Script' };
  }

  try {
    const cleanUrl = scriptUrl.trim();
    // Gọi thông qua proxy server để bypass CORS
    const proxyUrl = `/api/proxy-sheet?url=${encodeURIComponent(cleanUrl)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      return { success: false, message: `Lỗi kết nối HTTP ${resp.status}: Máy chủ không phản hồi.` };
    }

    const text = await resp.text();
    const trimmed = text.trim();

    // Thử parse JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const data = JSON.parse(trimmed);
      const runnersList = Array.isArray(data) ? data : data.runners || data.data || [];
      const count = runnersList.length;
      return {
        success: true,
        count,
        message: `Kết nối thành công! Đã tìm thấy ${count} vận động viên trong dữ liệu giải.`,
        sample: runnersList[0],
      };
    }

    // Nếu trả về TSV / CSV
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      return {
        success: true,
        count: lines.length - 1,
        message: `Kết nối thành công! Nhận được ${lines.length - 1} dòng dữ liệu từ Google Apps Script.`,
      };
    }

    return {
      success: false,
      message: 'Script phản hồi nhưng không chứa cấu trúc dữ liệu JSON/TSV hợp lệ.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Không thể kết nối đến đường dẫn Script đã cung cấp.',
    };
  }
}

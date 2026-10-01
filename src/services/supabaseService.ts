import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Runner, SupabaseConfig } from '../types';
import { getRunnerSplitData } from '../utils/runnerSplits';

const GLOBAL_SUPABASE_STORAGE_KEY = 'vm_supabase_global_config';

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: '',
  anonKey: '',
  table: 'runners',
  raceColumn: 'Race',
  raceValue: '',
};

/**
 * Lấy cấu hình Supabase dùng chung lưu trong localStorage hoặc từ biến môi trường
 */
export function getGlobalSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_SUPABASE_CONFIG };
  try {
    const raw = localStorage.getItem(GLOBAL_SUPABASE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SUPABASE_CONFIG,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Lỗi đọc cấu hình Supabase từ localStorage:', err);
  }

  // Fallback to Vite env variables if set
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  return {
    ...DEFAULT_SUPABASE_CONFIG,
    url: envUrl,
    anonKey: envKey,
  };
}

/**
 * Lưu cấu hình Supabase dùng chung vào localStorage
 */
export function saveGlobalSupabaseConfig(config: Partial<SupabaseConfig>): SupabaseConfig {
  const current = getGlobalSupabaseConfig();
  const updated: SupabaseConfig = {
    ...current,
    ...config,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(GLOBAL_SUPABASE_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Lỗi lưu cấu hình Supabase:', err);
    }
  }
  return updated;
}

/**
 * Làm sạch và chuẩn hoá Supabase URL
 * Nếu người dùng dán nhầm đường dẫn REST (ví dụ: https://xxx.supabase.co/rest/v1/),
 * hàm này sẽ tự động loại bỏ /rest/v1/ để lấy đúng Project URL gốc.
 */
export function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/rest\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

/**
 * Khởi tạo Supabase client
 */
export function getSupabaseClient(url: string, key: string): SupabaseClient | null {
  const cleanUrl = cleanSupabaseUrl(url);
  const cleanKey = (key || '').trim();
  if (!cleanUrl || !cleanKey) return null;
  try {
    return createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error('Không thể khởi tạo Supabase Client:', err);
    return null;
  }
}

/**
 * Tìm giá trị trường trong object không phân biệt hoa thường hoặc dấu gạch dưới
 */
function getFieldCaseInsensitive(row: Record<string, any>, candidateKeys: string[]): any {
  if (!row || typeof row !== 'object') return undefined;
  const rowKeys = Object.keys(row);
  for (const candidate of candidateKeys) {
    const normCand = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of rowKeys) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey === normCand && row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
  }
  return undefined;
}

/**
 * Chuyển đổi 1 bản ghi bất kỳ từ bảng Supabase sang cấu trúc Runner
 */
export function mapSupabaseRowToRunner(row: Record<string, any>, defaultDate: string = '2026'): Runner {
  const rawBib = getFieldCaseInsensitive(row, ['bib', 'so_bib', 'bib_number', 'bibno', 'id']) ?? '';
  const bib = String(rawBib).trim();

  const rawName = getFieldCaseInsensitive(row, ['name', 'athlete', 'ho_ten', 'full_name', 'vdv', 'ten']) ?? '';
  const name = String(rawName).trim() || 'Vận động viên';

  const rawGender = getFieldCaseInsensitive(row, ['gender', 'gioi_tinh', 'sex', 'phai']) ?? 'M';
  const gStr = String(rawGender).trim().toUpperCase();
  const gender = gStr.startsWith('F') || gStr.includes('NỮ') || gStr === 'FEMALE' ? 'F' : 'M';

  // Distance
  let rawDist = getFieldCaseInsensitive(row, ['distance', 'cu_ly', 'dist', 'distanceDisplay', 'cự ly']) ?? '';
  let distance = String(rawDist).trim();
  if (!distance) {
    const first = bib.charAt(0);
    if (first === '9') distance = '42K';
    else if (first === '8') distance = '21K';
    else if (first === '6' || first === '1') distance = '10K';
    else distance = '5K';
  } else {
    // If distance has '21km' -> '21K'
    const dUp = distance.toUpperCase();
    if (dUp.includes('42') || dUp.includes('FULL')) distance = '42K';
    else if (dUp.includes('21') || dUp.includes('HALF')) distance = '21K';
    else if (dUp.includes('10')) distance = '10K';
    else if (dUp.includes('5')) distance = '5K';
  }

  const overallRank = getFieldCaseInsensitive(row, ['overallRank', 'overall_rank', 'overall', 'hang_chung', 'rank_overall', 'rank']) ?? '-';
  const genderRank = getFieldCaseInsensitive(row, ['genderRank', 'gender_rank', 'gender', 'hang_gioi_tinh', 'rank_gender']) ?? '-';
  const ag = getFieldCaseInsensitive(row, ['ag', 'age_group', 'nhom_tuoi', 'ageGroup', 'lứa tuổi', 'lua_tuoi']) ?? '-';
  const ageGroupRank = getFieldCaseInsensitive(row, ['ageGroupRank', 'age_group_rank', 'hang_nhom_tuoi', 'rank_age_group', 'rank_ag']) ?? '-';

  const gunTime = String(getFieldCaseInsensitive(row, ['gunTime', 'gun_time', 'gun', 'thoi_gian_gun']) ?? '--:--:--').trim();
  const chipTime = String(getFieldCaseInsensitive(row, ['chipTime', 'chip_time', 'net_time', 'chip', 'net', 'thoi_gian_chip']) ?? '--:--:--').trim();
  const pace = getFieldCaseInsensitive(row, ['pace', 'avgPace', 'avg_pace', 'pace_tb']);
  const date = String(getFieldCaseInsensitive(row, ['date', 'ngay', 'race_date']) ?? defaultDate).trim();
  const photoUrl = getFieldCaseInsensitive(row, ['photoUrl', 'photo_url', 'photo', 'image', 'avatar', 'img_url', 'anh']);

  const startTime = getFieldCaseInsensitive(row, ['startTime', 'start_time', 'start', 'xuat_phat']);
  const cp1 = getFieldCaseInsensitive(row, ['cp1', 'checkpoint1', 'cp_1']);
  const cp1Pace = getFieldCaseInsensitive(row, ['cp1Pace', 'cp1_pace', 'pace_cp1']);
  const cp2 = getFieldCaseInsensitive(row, ['cp2', 'checkpoint2', 'cp_2']);
  const cp2Pace = getFieldCaseInsensitive(row, ['cp2Pace', 'cp2_pace', 'pace_cp2']);
  const cp3 = getFieldCaseInsensitive(row, ['cp3', 'checkpoint3', 'cp_3']);
  const cp3Pace = getFieldCaseInsensitive(row, ['cp3Pace', 'cp3_pace', 'pace_cp3']);
  const avgPace = getFieldCaseInsensitive(row, ['avgPace', 'avg_pace', 'pace', 'average_pace']);
  const finishPace = getFieldCaseInsensitive(row, ['finishPace', 'finish_pace', 'pace_finish']);

  const baseRunner: Runner = {
    bib,
    name,
    gender,
    distance,
    distanceDisplay: distance,
    overallRank: String(overallRank),
    genderRank: String(genderRank),
    ag: String(ag),
    ageGroupRank: String(ageGroupRank),
    gunTime: gunTime || '--:--:--',
    chipTime: chipTime || '--:--:--',
    pace: pace ? String(pace) : undefined,
    date: date || defaultDate,
    photoUrl: photoUrl ? String(photoUrl) : undefined,
    startTime: startTime ? String(startTime) : undefined,
    cp1: cp1 ? String(cp1) : undefined,
    cp1Pace: cp1Pace ? String(cp1Pace) : undefined,
    cp2: cp2 ? String(cp2) : undefined,
    cp2Pace: cp2Pace ? String(cp2Pace) : undefined,
    cp3: cp3 ? String(cp3) : undefined,
    cp3Pace: cp3Pace ? String(cp3Pace) : undefined,
    avgPace: avgPace ? String(avgPace) : undefined,
    finishPace: finishPace ? String(finishPace) : undefined,
  };

  // Tự động tính toán các checkpoint thiếu
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

  return baseRunner;
}

export interface SupabaseTestResult {
  success: boolean;
  message: string;
  totalRows?: number;
  matchingRows?: number;
  detectedRaces?: string[];
  sampleRunners?: Runner[];
  columnsFound?: string[];
  durationMs?: number;
}

/**
 * Kiểm tra kết nối tới Supabase, kiểm tra bảng và xem thử các giá trị trong cột Race
 */
export async function testSupabaseConnection(
  config: SupabaseConfig,
  raceValueToTest?: string
): Promise<SupabaseTestResult> {
  const t0 = performance.now();
  const url = (config.url || '').trim();
  const key = (config.anonKey || '').trim();
  const table = (config.table || 'runners').trim();
  const raceCol = (config.raceColumn || 'Race').trim();
  const targetRace = (raceValueToTest ?? config.raceValue ?? '').trim();

  if (!url) {
    return { success: false, message: 'Vui lòng nhập API URL của dự án Supabase.' };
  }
  if (!key) {
    return { success: false, message: 'Vui lòng nhập Publishable key (Anon key) của Supabase.' };
  }
  if (!table) {
    return { success: false, message: 'Vui lòng nhập tên Table (ví dụ: runners).' };
  }

  const client = getSupabaseClient(url, key);
  if (!client) {
    return { success: false, message: 'Không thể khởi tạo kết nối Supabase. Vui lòng kiểm tra định dạng URL.' };
  }

  try {
    // 1. Thử lấy mẫu bản ghi bất kỳ để kiểm tra bảng & các cột
    const sampleQuery = await client.from(table).select('*').limit(200);

    if (sampleQuery.error) {
      return {
        success: false,
        message: `Lỗi truy vấn bảng "${table}": ${sampleQuery.error.message || sampleQuery.error.details || 'Không thể đọc dữ liệu'}`,
      };
    }

    const rows = sampleQuery.data || [];
    const columnsFound = rows.length > 0 ? Object.keys(rows[0]) : [];

    // Tìm cột Race tương thích (Race, race, race_code, giai, ...)
    let actualRaceCol = raceCol;
    if (columnsFound.length > 0 && !columnsFound.includes(actualRaceCol)) {
      const match = columnsFound.find(
        (c) => c.toLowerCase() === raceCol.toLowerCase() || c.toLowerCase() === 'race' || c.toLowerCase() === 'giai'
      );
      if (match) actualRaceCol = match;
    }

    // Thu thập các giá trị giải đấu có sẵn trong cột Race để gợi ý cho người dùng
    const distinctRacesSet = new Set<string>();
    rows.forEach((r) => {
      const val = r[actualRaceCol] ?? r.Race ?? r.race ?? r.race_code ?? r.giai;
      if (val !== undefined && val !== null && String(val).trim()) {
        distinctRacesSet.add(String(val).trim());
      }
    });
    const detectedRaces = Array.from(distinctRacesSet);

    // 2. Thử truy vấn có lọc theo giải nếu có chỉ định giá trị lọc
    let matchingRows = 0;
    let sampleRunners: Runner[] = [];

    if (targetRace) {
      // Thử lọc chính xác hoặc ilike
      let filterQuery = await client
        .from(table)
        .select('*', { count: 'exact' })
        .eq(actualRaceCol, targetRace)
        .limit(5);

      if (filterQuery.error && actualRaceCol !== 'race') {
        filterQuery = await client
          .from(table)
          .select('*', { count: 'exact' })
          .eq('race', targetRace)
          .limit(5);
      }

      if (!filterQuery.error && filterQuery.data) {
        matchingRows = filterQuery.count ?? filterQuery.data.length;
        sampleRunners = (filterQuery.data || []).map((r) => mapSupabaseRowToRunner(r));
      } else {
        // Fallback filter in memory from the sample rows
        const matched = rows.filter((r) => {
          const v = String(r[actualRaceCol] ?? r.Race ?? r.race ?? '').trim().toLowerCase();
          return v === targetRace.toLowerCase();
        });
        matchingRows = matched.length;
        sampleRunners = matched.slice(0, 5).map((r) => mapSupabaseRowToRunner(r));
      }
    } else {
      sampleRunners = rows.slice(0, 5).map((r) => mapSupabaseRowToRunner(r));
      matchingRows = rows.length;
    }

    const durationMs = Math.round(performance.now() - t0);

    return {
      success: true,
      message: `Kết nối thành công tới Supabase! Bảng "${table}" phản hồi tốt (${durationMs}ms).` +
        (targetRace ? ` Tìm thấy ${matchingRows} VĐV thuộc giải "${targetRace}".` : ` Tìm thấy ${rows.length} bản ghi mẫu.`),
      totalRows: rows.length,
      matchingRows,
      detectedRaces,
      sampleRunners,
      columnsFound,
      durationMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối Supabase: ${err.message || 'Không thể gửi yêu cầu'}`,
    };
  }
}

/**
 * Tải danh sách vận động viên từ bảng Supabase theo cột Race
 */
export async function fetchRunnersFromSupabase(
  config: SupabaseConfig,
  raceFilter?: string,
  raceDate: string = '2026'
): Promise<{ runners: Runner[]; error?: string; count: number }> {
  const url = (config.url || '').trim();
  const key = (config.anonKey || '').trim();
  const table = (config.table || 'runners').trim();
  const raceCol = (config.raceColumn || 'Race').trim();
  const filter = (raceFilter !== undefined ? raceFilter : (config.raceValue || '')).trim();

  if (!url || !key) {
    return { runners: [], error: 'Chưa cấu hình Supabase URL hoặc Publishable key.', count: 0 };
  }

  const client = getSupabaseClient(url, key);
  if (!client) {
    return { runners: [], error: 'Khởi tạo Supabase client thất bại.', count: 0 };
  }

  try {
    let query = client.from(table).select('*');

    // Lọc theo cột Race nếu có giá trị lọc
    if (filter) {
      query = query.eq(raceCol, filter);
    }

    let { data, error } = await query;

    // Nếu query gặp lỗi (ví dụ do PostgREST không tìm thấy cột hoa "Race" trong postgres unquoted), thử lại với chữ thường "race"
    if (error && raceCol !== 'race' && filter) {
      const retry = await client.from(table).select('*').eq('race', filter);
      if (!retry.error && retry.data) {
        data = retry.data;
        error = null;
      }
    }

    // Nếu vẫn lỗi và có filter, thử lấy toàn bộ rồi lọc tại frontend
    if (error && filter) {
      const fallbackAll = await client.from(table).select('*').limit(5000);
      if (!fallbackAll.error && fallbackAll.data) {
        const filtered = fallbackAll.data.filter((row: any) => {
          const val = row[raceCol] ?? row.Race ?? row.race ?? row.race_code ?? row.giai;
          return String(val ?? '').trim().toLowerCase() === filter.toLowerCase();
        });
        const mapped = filtered.map((r: any) => mapSupabaseRowToRunner(r, raceDate));
        return { runners: mapped, count: mapped.length };
      }
    }

    if (error) {
      return {
        runners: [],
        error: `Supabase query error (${table}): ${error.message}`,
        count: 0,
      };
    }

    if (!data || data.length === 0) {
      // Thử tìm xem có bản ghi nào nhưng khác chữ hoa thường của filter không
      return {
        runners: [],
        error: filter ? `Không có VĐV nào có cột ${raceCol} = "${filter}" trong bảng ${table}.` : undefined,
        count: 0,
      };
    }

    const runners = data.map((row: any) => mapSupabaseRowToRunner(row, raceDate));
    return { runners, count: runners.length };
  } catch (err: any) {
    return {
      runners: [],
      error: err.message || 'Lỗi ngoại lệ khi tải dữ liệu từ Supabase.',
      count: 0,
    };
  }
}

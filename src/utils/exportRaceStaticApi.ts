import { Race } from '../data/races';
import { CertificatePlacements } from '../types';
import { DEFAULT_NGHE_AN_PLACEMENTS, getSavedPlacements } from '../data/certificatePlacements';

export interface StaticRaceApiDefinition {
  $schema?: string;
  version?: string;
  exportedAt?: string;
  instructions?: string;
  id: string;
  slug: string;
  code: string;
  name: string;
  shortName: string;
  city?: string;
  province?: string;
  locationFull?: string;
  date?: string;
  officialUrl?: string;
  defaultLogoUrl?: string;
  defaultBgUrl: string;
  accentColor?: string;
  themeBadgeBg?: string;
  themeDotBg?: string;
  storageKeyPrefix?: string;
  appsScriptUrl?: string;
  photosScriptUrl?: string;
  checkingScriptUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseTable?: string;
  supabaseRaceFilter?: string;
  supabaseRaceColumn?: string;
  description?: string;
  placements: CertificatePlacements;
  backgroundDataUrl?: string;
}

/**
 * Xuất cấu hình giải đấu & toạ độ phôi ra file API JSON tĩnh
 * File này có thể ném trực tiếp vào thư mục `/public/races/` trong code để hệ thống tự động sinh ra giải mới.
 */
export function exportRaceStaticApi(
  race: Race,
  placements?: CertificatePlacements,
  customFileName?: string
): void {
  const activePlacements: CertificatePlacements =
    placements && Object.keys(placements).length > 0
      ? placements
      : race.placements && Object.keys(race.placements).length > 0
      ? race.placements
      : getSavedPlacements() || DEFAULT_NGHE_AN_PLACEMENTS;

  const cleanSlug = (race.slug || race.id || 'giai')
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9_-]/g, '-');

  const raceApiData: StaticRaceApiDefinition = {
    $schema: 'https://marathon-api/v1/race-definition.json',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    instructions:
      'Ném file .json này vào thư mục "public/races/" trong mã nguồn dự án. Hệ thống sẽ tự động đọc và tạo giải mới.',
    id: race.id || cleanSlug,
    slug: cleanSlug,
    code: race.code || cleanSlug.toUpperCase().slice(0, 6),
    name: race.name,
    shortName: race.shortName || race.name,
    city: race.city || '',
    province: race.province || '',
    locationFull: race.locationFull || '',
    date: race.date || '2026',
    officialUrl: race.officialUrl || `https://vm.vnexpress.net/${cleanSlug}`,
    defaultLogoUrl: race.defaultLogoUrl || '/race_logo.png',
    defaultBgUrl: race.defaultBgUrl || '/NA26.png',
    accentColor: race.accentColor || '#0369a1',
    themeBadgeBg: race.themeBadgeBg || 'bg-sky-50 text-sky-700 border-sky-200/80',
    themeDotBg: race.themeDotBg || 'bg-sky-600',
    storageKeyPrefix: race.storageKeyPrefix || `vm_${cleanSlug.replace(/[^a-z0-9]/g, '')}`,
    appsScriptUrl: race.appsScriptUrl || '',
    photosScriptUrl: race.photosScriptUrl || '',
    checkingScriptUrl: race.checkingScriptUrl || '',
    supabaseUrl: race.supabaseUrl || '',
    supabaseAnonKey: race.supabaseAnonKey || '',
    supabaseTable: race.supabaseTable || 'runners',
    supabaseRaceFilter: race.supabaseRaceFilter || race.code || '',
    supabaseRaceColumn: race.supabaseRaceColumn || 'Race',
    description: race.description || `Tra cứu kết quả & Chứng nhận điện tử ${race.name}`,
    placements: activePlacements,
  };

  const jsonString = JSON.stringify(raceApiData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const fileName = customFileName || `race_api_${cleanSlug}.json`;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Đọc file JSON cấu hình API tĩnh để import giải đấu vào hệ thống
 */
export async function importRaceFromStaticApi(file: File): Promise<{
  raceInfo: Partial<Race>;
  placements: CertificatePlacements;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error('File rỗng, không có dữ liệu');
        }

        const data = JSON.parse(text);
        const item = Array.isArray(data) ? data[0] : data;

        if (!item || (!item.name && !item.slug && !item.id)) {
          throw new Error('File JSON không đúng cấu trúc cấu hình giải đấu (thiếu tên giải hoặc URL slug)');
        }

        const cleanSlug = (item.slug || item.id || '')
          .toLowerCase()
          .trim()
          .replace(/^\/+|\/+$/g, '')
          .replace(/[^a-z0-9_-]/g, '-');

        const raceInfo: Partial<Race> = {
          id: item.id || cleanSlug,
          slug: cleanSlug,
          code: item.code || cleanSlug.toUpperCase().slice(0, 6),
          name: item.name || cleanSlug,
          shortName: item.shortName || item.name || cleanSlug,
          city: item.city || '',
          province: item.province || '',
          locationFull: item.locationFull || '',
          date: item.date || '2026',
          officialUrl: item.officialUrl || `https://vm.vnexpress.net/${cleanSlug}`,
          defaultLogoUrl: item.defaultLogoUrl || '/race_logo.png',
          defaultBgUrl: item.defaultBgUrl || '/NA26.png',
          accentColor: item.accentColor || '#0369a1',
          themeBadgeBg: item.themeBadgeBg || 'bg-sky-50 text-sky-700 border-sky-200/80',
          themeDotBg: item.themeDotBg || 'bg-sky-600',
          storageKeyPrefix: item.storageKeyPrefix || `vm_${cleanSlug.replace(/[^a-z0-9]/g, '')}`,
          appsScriptUrl: item.appsScriptUrl || '',
          photosScriptUrl: item.photosScriptUrl || '',
          checkingScriptUrl: item.checkingScriptUrl || '',
          supabaseUrl: item.supabaseUrl || '',
          supabaseAnonKey: item.supabaseAnonKey || '',
          supabaseTable: item.supabaseTable || 'runners',
          supabaseRaceFilter: item.supabaseRaceFilter || item.code || '',
          supabaseRaceColumn: item.supabaseRaceColumn || 'Race',
          description: item.description || '',
        };

        const placements: CertificatePlacements = {
          ...DEFAULT_NGHE_AN_PLACEMENTS,
          ...(item.placements || {}),
        };

        resolve({ raceInfo, placements });
      } catch (err: any) {
        reject(new Error(err.message || 'Lỗi khi đọc file JSON'));
      }
    };

    reader.onerror = () => reject(new Error('Lỗi khi đọc file từ máy'));
    reader.readAsText(file);
  });
}

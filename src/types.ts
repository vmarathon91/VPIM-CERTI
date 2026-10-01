export interface Runner {
  bib: string;
  name: string;
  gender: 'M' | 'F' | string;
  distance: string; // e.g. 'Half Marathon' or 'Full Marathon' or '10KM' or '5KM'
  distanceDisplay?: string; // e.g. 'Đã hoàn thành | Has Completed Half Marathon'
  overallRank: number | string;
  genderRank: number | string;
  ag: string; // Age Group, e.g. '30-39'
  ageGroupRank: number | string;
  gunTime: string; // e.g. '01:45:20'
  chipTime: string; // e.g. '01:44:12'
  pace?: string;
  date?: string; // default '13/09/2026'
  photoUrl?: string; // Optional runner photo URL
  racePhotos?: string[]; // Danh sách link ảnh thi đấu theo số BIB từ Google Sheet (Cột BIB & IMG)

  // Checkpoint parameters & paces requested
  startTime?: string;
  cp1?: string;
  cp1Pace?: string;
  cp2?: string;
  cp2Pace?: string;
  cp3?: string;
  cp3Pace?: string;
  avgPace?: string;
  finishPace?: string;
}

export interface PersonalPhotoOverlayConfig {
  showOverlay: boolean; // default true
  showChart: boolean;   // default true
  position: 'bottom' | 'top'; // default 'bottom'
  theme: 'dark' | 'glass' | 'neon'; // default 'dark'
}

export interface CertificateFieldPlacement {
  id: string;
  label: string; // Tên hiển thị (e.g. "Tên VĐV", "Cự ly", "Số BIB", ...)
  x: number; // Tọa độ X (%: 0 - 100)
  y: number; // Tọa độ Y (%: 0 - 100)
  fontSize: number; // Cỡ chữ chuẩn px trên canvas width 1469
  color: string; // Mã màu hex
  align: 'left' | 'center' | 'right';
  fontWeight: 600 | 700 | 800 | 900;
}

export type CertificatePlacements = Record<string, CertificateFieldPlacement>;

export interface CertificateConfig {
  bgMode: 'official' | 'generated' | 'custom';
  customBgDataUrl: string | null;
  nameY: number; // percentage from top (e.g. 33%)
  distanceY: number; // percentage from top (e.g. 38%)
  statsY: number; // percentage from top (e.g. 43%)
  statsLayout: 'vertical' | 'horizontal'; // 'vertical' (dạng dọc) | 'horizontal' (dạng lưới ngang)
  showStatsCard?: boolean; // khung mờ nền phía sau (mặc định bật)
  statsLineSpacing?: number; // khoảng cách dòng trong dạng dọc (0.8 -> 1.5)
  fontSizeMultiplier: number;
  textColor: string; // e.g. '#ffffff'
  nameColor?: string; // default '#78ffd8'
  distanceColor?: string; // default '#ffffff'
  showDistanceUnderline?: boolean; // default false
  statsLabelColor?: string; // default '#ffffff'
  statsValueColor?: string; // default '#fddfac'
  accentColor: string; // e.g. '#2dd4bf' (mint teal) or '#facc15' (gold)
  uppercaseName: boolean;
  hideStatsLabels?: boolean; // Bỏ các chữ nhãn, chỉ vẽ tham số kết quả
  placements?: CertificatePlacements; // Tùy chỉnh vị trí và cỡ chữ từng giá trị
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  table: string; // e.g. 'runners'
  raceColumn: string; // e.g. 'Race'
  raceValue?: string; // e.g. 'NA26' or 'test'
}

export interface DataSourceSettings {
  type: 'supabase' | 'appsScript' | 'mock' | 'csvUrl';
  url: string;
  lastSyncedAt?: string;
  supabase?: SupabaseConfig;
}

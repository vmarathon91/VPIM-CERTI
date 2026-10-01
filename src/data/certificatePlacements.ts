import { CertificatePlacements } from '../types';

export const DEFAULT_NGHE_AN_PLACEMENTS: CertificatePlacements = {
  name: {
    id: 'name',
    label: 'Tên Vận Động Viên',
    x: 50,
    y: 32.84,
    fontSize: 66,
    color: '#054b53',
    align: 'center',
    fontWeight: 800,
  },
  distance: {
    id: 'distance',
    label: 'Cự ly (VD: 21K, 42K)',
    x: 36.5,
    y: 36.63,
    fontSize: 50,
    color: '#054b53',
    align: 'center',
    fontWeight: 800,
  },
  bib: {
    id: 'bib',
    label: 'Số BIB (VD: 90110)',
    x: 72.5,
    y: 36.63,
    fontSize: 50,
    color: '#054b53',
    align: 'center',
    fontWeight: 800,
  },
  chipTime: {
    id: 'chipTime',
    label: 'Thời gian Chip Time',
    x: 52.8,
    y: 49.1,
    fontSize: 200,
    color: '#fff100',
    align: 'center',
    fontWeight: 700,
  },
  finishTime: {
    id: 'finishTime',
    label: 'Finish Time (Gun Time)',
    x: 31.5,
    y: 54.5,
    fontSize: 55,
    color: '#FFF100',
    align: 'left',
    fontWeight: 600,
  },
  overallRank: {
    id: 'overallRank',
    label: 'Hạng Chung cuộc (Overall)',
    x: 28.5,
    y: 58.1,
    fontSize: 55,
    color: '#FFF100',
    align: 'left',
    fontWeight: 600,
  },
  genderRank: {
    id: 'genderRank',
    label: 'Hạng Giới tính (Gender)',
    x: 79.5,
    y: 58,
    fontSize: 55,
    color: '#FFF100',
    align: 'left',
    fontWeight: 600,
  },
  ageGroupRank: {
    id: 'ageGroupRank',
    label: 'Hạng Lứa tuổi (Age Group)',
    x: 49,
    y: 61.6,
    fontSize: 55,
    color: '#FFF100',
    align: 'left',
    fontWeight: 600,
  },
};

const STORAGE_KEY = 'vm_nghean_certificate_placements_v2';

export const getSavedPlacements = (): CertificatePlacements => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NGHE_AN_PLACEMENTS;
    const parsed = JSON.parse(raw);
    // Merge with defaults in case of missing keys
    return {
      ...DEFAULT_NGHE_AN_PLACEMENTS,
      ...parsed,
    };
  } catch {
    return DEFAULT_NGHE_AN_PLACEMENTS;
  }
};

export const savePlacements = (placements: CertificatePlacements): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
  } catch (err) {
    console.error('Failed to save placements to localStorage', err);
  }
};

export const resetPlacements = (): CertificatePlacements => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return DEFAULT_NGHE_AN_PLACEMENTS;
};

export const clearSavedUserPlacements = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('vm_nghean_certificate_placements');
    localStorage.removeItem('vm_quynhon_certificate_placements');
  } catch {}
};

export const fetchServerDefaultPlacements = async (): Promise<CertificatePlacements | null> => {
  try {
    const res = await fetch('/api/default-placements');
    if (res.ok) {
      const data = await res.json();
      if (data && data.name) {
        return {
          ...DEFAULT_NGHE_AN_PLACEMENTS,
          ...data,
        };
      }
    }
  } catch {}
  return null;
};
